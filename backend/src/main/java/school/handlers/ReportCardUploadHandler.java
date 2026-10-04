// src/main/java/school/handlers/ReportCardUploadHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

        // ===== POST /api/report-cards/upload (teacher) =====
        if ("/api/report-cards/upload".equals(path) && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "teacher");

            String contentType = ex.getRequestHeaders().getFirst("Content-Type");
            if (contentType == null || !contentType.startsWith("multipart/form-data")) {
                throw new ApiError(400, "Content-Type must be multipart/form-data");
            }
            String boundary = "--" + contentType.substring(contentType.indexOf("boundary=") + 9).trim();

            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[16384];
            int n;
            long total = 0;
            InputStream is = ex.getRequestBody();
            while ((n = is.read(chunk)) != -1) {
                total += n;
                if (total > 5 * 1024 * 1024) throw new ApiError(400, "File exceeds 5MB limit");
                buf.write(chunk, 0, n);
            }
            byte[] bodyBytes = buf.toByteArray();
            String bodyStr = new String(bodyBytes, StandardCharsets.ISO_8859_1);

            // ROBUST multipart parsing: split into parts instead of fragile index math
            Map<String, String> fields = new HashMap<>();
            String fileName = null, fileType = null;
            byte[] fileData = null;

            for (String part : bodyStr.split(Pattern.quote(boundary))) {
                int headerEnd = part.indexOf("\r\n\r\n");
                if (headerEnd == -1) continue;
                String headers = part.substring(0, headerEnd);
                String value = part.substring(headerEnd + 4);
                if (value.endsWith("\r\n")) value = value.substring(0, value.length() - 2);

                Matcher nm = Pattern.compile("name=\"([^\"]*)\"").matcher(headers);
                if (!nm.find()) continue;
                String fieldName = nm.group(1).trim();

                if (headers.contains("filename=")) {
                    Matcher fm = Pattern.compile("filename=\"([^\"]*)\"").matcher(headers);
                    if (fm.find()) fileName = fm.group(1);
                    Matcher cm = Pattern.compile("Content-Type:\\s*([^\r\n]+)", Pattern.CASE_INSENSITIVE).matcher(headers);
                    if (cm.find()) fileType = cm.group(1).trim();
                    fileData = value.getBytes(StandardCharsets.ISO_8859_1);
                } else {
                    fields.put(fieldName, value.trim());
                }
            }

            int studentId, examId;
            try {
                studentId = Integer.parseInt(fields.getOrDefault("studentId", ""));
                examId = Integer.parseInt(fields.getOrDefault("examId", ""));
            } catch (Exception e) {
                throw new ApiError(400, "studentId and examId are required and must be whole numbers");
            }

            verifyExists("students", studentId, "Student");
            verifyExists("exams", examId, "Exam");

            // Teacher may only upload for students in THEIR class
            Map<String, Object> student = Database.queryOne("SELECT class_id FROM students WHERE id = ?", studentId);
            int classId = ((Number) student.get("class_id")).intValue();
            Map<String, Object> assignment = Database.queryOne(
                    "SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?", user.id, classId);
            if (assignment == null) throw new ApiError(403, "This student is not in your class");

            // File validation: PDF / PNG / JPEG only
            if (fileName == null || fileData == null || fileData.length == 0) {
                throw new ApiError(400, "A valid file is required");
            }
            String lower = fileName.toLowerCase();
            if (!(lower.endsWith(".pdf") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg"))) {
                throw new ApiError(400, "Only PDF, PNG, or JPEG files are allowed");
            }
            if (fileType == null || fileType.isEmpty()) {
                fileType = lower.endsWith(".pdf") ? "application/pdf"
                        : lower.endsWith(".png") ? "image/png" : "image/jpeg";
            }

            Database.update(
                    "INSERT INTO report_card_uploads (student_id, exam_id, teacher_id, file_name, file_data, file_type) VALUES (?, ?, ?, ?, ?, ?)",
                    studentId, examId, user.id, fileName, fileData, fileType);

            AuditLogger.success(user, "REPORT_CARD_UPLOADED", "report_card_uploads", null, null,
                    Map.of("student_id", studentId, "exam_id", examId));
            Json.send(ex, 200, Map.of("message", "Report card uploaded successfully"));
            return;
        }

        // ===== GET /api/report-cards/pending (admin — unpublished uploads) =====
        if ("/api/report-cards/pending".equals(path) && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            List<Map<String, Object>> pending = Database.query(
                    "SELECT r.id, r.file_name, r.file_type, r.uploaded_at, r.student_id, r.exam_id, " +
                            "s.full_name AS student_name, s.admission_no, e.name AS exam_name, u.full_name AS teacher_name " +
                            "FROM report_card_uploads r " +
                            "JOIN students s ON r.student_id = s.id " +
                            "JOIN exams e ON r.exam_id = e.id " +
                            "JOIN users u ON r.teacher_id = u.id " +
                            "WHERE r.published = FALSE ORDER BY r.uploaded_at DESC"
            );
            Json.send(ex, 200, pending);
            return;
        }

        // ===== POST /api/report-cards/{id}/publish (admin) =====
        if (path.matches("/api/report-cards/\\d+/publish") && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            int id = pathInt(path.split("/")[3]);

            Map<String, Object> upload = Database.queryOne(
                    "SELECT r.student_id, r.published, s.full_name AS student_name, s.user_id AS student_user_id " +
                            "FROM report_card_uploads r JOIN students s ON r.student_id = s.id WHERE r.id = ?", id);
            if (upload == null) throw new ApiError(404, "Report card not found");
            if (Boolean.TRUE.equals(upload.get("published"))) {
                throw new ApiError(400, "This report card is already published");
            }

            Database.update("UPDATE report_card_uploads SET published = TRUE WHERE id = ?", id);

            // Notify the student (in-app) and each parent (email + sms)
            String studentName = (String) upload.get("student_name");
            int studentUserId = ((Number) upload.get("student_user_id")).intValue();
            Notifier.notify(studentUserId, "REPORT_CARD_PUBLISHED", Map.of("student", studentName));

            List<Map<String, Object>> parents = Database.query(
                    "SELECT parent_user_id FROM parent_links WHERE student_id = ?", upload.get("student_id"));
            for (Map<String, Object> p : parents) {
                Notifier.notify(((Number) p.get("parent_user_id")).intValue(),
                        "REPORT_CARD_PUBLISHED", Map.of("student", studentName));
            }

            AuditLogger.success(user, "REPORT_CARD_PUBLISHED", "report_card_uploads", id, null,
                    Map.of("student_id", upload.get("student_id")));
            Json.send(ex, 200, Map.of("message", "Report card published"));
            return;
        }

        // ===== GET /api/report-cards/{id}/download (role-checked file serve) =====
        if (path.matches("/api/report-cards/\\d+/download") && "GET".equalsIgnoreCase(method)) {
            int id = pathInt(path.split("/")[3]);
            Map<String, Object> upload = Database.queryOne(
                    "SELECT r.file_name, r.file_type, r.file_data, r.published, r.student_id, " +
                            "s.user_id AS student_user_id " +
                            "FROM report_card_uploads r JOIN students s ON r.student_id = s.id WHERE r.id = ?", id);
            if (upload == null) throw new ApiError(404, "Report card not found");

            boolean published = Boolean.TRUE.equals(upload.get("published"));
            if (!published) {
                // Unpublished cards: staff only
                requireRole(user, "super_admin", "admin", "teacher");
            } else if ("student".equals(user.role)) {
                if (user.id != ((Number) upload.get("student_user_id")).intValue()) {
                    throw new ApiError(403, "This is not your report card");
                }
            } else if ("parent".equals(user.role)) {
                Map<String, Object> link = Database.queryOne(
                        "SELECT 1 FROM parent_links WHERE parent_user_id = ? AND student_id = ?",
                        user.id, upload.get("student_id"));
                if (link == null) throw new ApiError(403, "This is not your child's report card");
            }

            byte[] fileData = (byte[]) upload.get("file_data");
            ex.getResponseHeaders().set("Content-Type", (String) upload.get("file_type"));
            ex.getResponseHeaders().set("Content-Disposition",
                    "attachment; filename=\"" + upload.get("file_name") + "\"");
            ex.sendResponseHeaders(200, fileData.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(fileData);
            }
            return;
        }

        // ===== GET /api/report-cards/uploads/{studentId}/{examId} (admin — metadata list) =====
        if (path.matches("/api/report-cards/uploads/\\d+/\\d+") && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            String[] parts = path.split("/");
            int studentId = Integer.parseInt(parts[4]);
            int examId = Integer.parseInt(parts[5]);

            List<Map<String, Object>> uploads = Database.query(
                    "SELECT id, file_name, file_type, published, uploaded_at FROM report_card_uploads " +
                            "WHERE student_id = ? AND exam_id = ? ORDER BY uploaded_at DESC",
                    studentId, examId
            );
            Json.send(ex, 200, uploads);
            return;
        }

        throw new ApiError(404, "Not found");
    }
}