// backend/src/main/java/school/handlers/ReportCardUploadHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class ReportCardUploadHandler extends SecureHandler {

    private void verifyExists(String table, int id, String entityName) {
        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
        if (row == null) {
            throw new ApiError(400, entityName + " with id " + id + " does not exist");
        }
    }

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/report-cards/upload".equals(path) && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "teacher");

            String contentType = ex.getRequestHeaders().getFirst("Content-Type");
            if (contentType == null || !contentType.startsWith("multipart/form-data")) {
                throw new ApiError(400, "Content-Type must be multipart/form-data");
            }

            String boundary = contentType.substring(contentType.indexOf("boundary=") + 9);
            byte[] boundaryBytes = ("--" + boundary).getBytes(StandardCharsets.UTF_8);

            InputStream is = ex.getRequestBody();
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            int totalRead = 0;
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
                totalRead += nRead;
                if (totalRead > 5 * 1024 * 1024) { // 5MB limit
                    throw new ApiError(400, "File exceeds 5MB limit");
                }
            }
            byte[] bodyBytes = buffer.toByteArray();

            // Basic multipart parsing
            String bodyStr = new String(bodyBytes, StandardCharsets.ISO_8859_1);

            int studentId = extractIntField(bodyStr, "studentId");
            int examId = extractIntField(bodyStr, "examId");

            verifyExists("students", studentId, "Student");
            verifyExists("exams", examId, "Exam");

            Map<String, Object> student = Database.queryOne("SELECT class_id FROM students WHERE id = ?", studentId);
            int classId = ((Number) student.get("class_id")).intValue();

            Map<String, Object> assignment = Database.queryOne("SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?", user.id, classId);
            if (assignment == null) throw new ApiError(403, "This is not your class");

            // Extract file
            int filePartStart = bodyStr.indexOf("name=\"file\"");
            if (filePartStart == -1) throw new ApiError(400, "Missing file part");

            int filenameStart = bodyStr.indexOf("filename=\"", filePartStart) + 10;
            int filenameEnd = bodyStr.indexOf("\"", filenameStart);
            String fileName = bodyStr.substring(filenameStart, filenameEnd);

            if (!fileName.toLowerCase().endsWith(".pdf") && !fileName.toLowerCase().endsWith(".png")) {
                throw new ApiError(400, "Only PDF and PNG files are allowed");
            }

            int contentTypeStart = bodyStr.indexOf("Content-Type: ", filePartStart) + 14;
            int contentTypeEnd = bodyStr.indexOf("\r\n", contentTypeStart);
            String fileType = bodyStr.substring(contentTypeStart, contentTypeEnd);

            int dataStart = bodyStr.indexOf("\r\n\r\n", filePartStart) + 4;
            int dataEnd = bodyStr.indexOf("\r\n--" + boundary, dataStart);

            if (dataStart == -1 || dataEnd == -1) throw new ApiError(400, "Malformed file data");

            byte[] fileData = new byte[dataEnd - dataStart];
            System.arraycopy(bodyBytes, dataStart, fileData, 0, fileData.length);

            Database.update(
                    "INSERT INTO report_card_uploads (student_id, exam_id, teacher_id, file_name, file_data, file_type) VALUES (?, ?, ?, ?, ?, ?)",
                    studentId, examId, user.id, fileName, fileData, fileType
            );

            AuditLogger.success(user, "REPORT_CARD_UPLOADED", "report_card_uploads", null, null, Map.of("student_id", studentId, "exam_id", examId));
            Json.send(ex, 200, Map.of("message", "Report card uploaded successfully"));
            return;
        }

        if (path.matches("/api/report-cards/uploads/\\d+/\\d+") && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            String[] parts = path.split("/");
            int studentId = Integer.parseInt(parts[4]);
            int examId = Integer.parseInt(parts[5]);

            List<Map<String, Object>> uploads = Database.query(
                    "SELECT id, file_name, file_type, uploaded_at FROM report_card_uploads WHERE student_id = ? AND exam_id = ? ORDER BY uploaded_at DESC",
                    studentId, examId
            );
            Json.send(ex, 200, uploads);
            return;
        }

        throw new ApiError(404, "Not found");
    }

    private int extractIntField(String bodyStr, String fieldName) {
        int start = bodyStr.indexOf("name=\"" + fieldName + "\"");
        if (start == -1) throw new ApiError(400, "Missing field: " + fieldName);
        start = bodyStr.indexOf("\r\n\r\n", start) + 4;
        int end = bodyStr.indexOf("\r\n", start);
        try {
            return Integer.parseInt(bodyStr.substring(start, end).trim());
        } catch (NumberFormatException e) {
            throw new ApiError(400, "Invalid number for field: " + fieldName);
        }
    }
}