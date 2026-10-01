// backend/src/main/java/school/config/Database.java
package school.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import school.http.ApiError;

import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Database {
    private static final HikariDataSource ds;

    static {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("org.postgresql.Driver"); // DEVIATION NOTICE: Preserved
        config.setJdbcUrl(Env.get("DB_URL"));
        config.setUsername(Env.get("DB_USER"));
        config.setPassword(Env.get("DB_PASS"));
        config.setMaximumPoolSize(10);
        ds = new HikariDataSource(config);
    }

    public interface SqlWork {
        void run(Connection con) throws Exception;
    }

    public static Connection getConnection() throws SQLException {
        return ds.getConnection();
    }

    public static List<Map<String, Object>> query(String sql, Object... params) {
        try (Connection con = getConnection()) {
            return query(con, sql, params);
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public static List<Map<String, Object>> query(Connection con, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            try (ResultSet rs = ps.executeQuery()) {
                List<Map<String, Object>> list = new ArrayList<>();
                ResultSetMetaData md = rs.getMetaData();
                int cols = md.getColumnCount();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= cols; i++) {
                        Object val = rs.getObject(i);
                        if (val instanceof java.sql.Timestamp) {
                            val = ((java.sql.Timestamp) val).toInstant().toString();
                        } else if (val instanceof java.sql.Date) {
                            val = new java.util.Date(((java.sql.Date) val).getTime()).toInstant().toString();
                        }
                        row.put(md.getColumnName(i), val);
                    }
                    list.add(row);
                }
                return list;
            }
        }
    }

    public static Map<String, Object> queryOne(String sql, Object... params) {
        try (Connection con = getConnection()) {
            return queryOne(con, sql, params);
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public static Map<String, Object> queryOne(Connection con, String sql, Object... params) throws SQLException {
        List<Map<String, Object>> results = query(con, sql, params);
        return results.isEmpty() ? null : results.get(0);
    }

    public static int update(String sql, Object... params) {
        try (Connection con = getConnection()) {
            return update(con, sql, params);
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public static int update(Connection con, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            return ps.executeUpdate();
        }
    }

    public static long insertReturningId(String sql, Object... params) {
        try (Connection con = getConnection();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
                throw new SQLException("Creating record failed, no ID obtained.");
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public static void transaction(SqlWork work) {
        try (Connection con = getConnection()) {
            con.setAutoCommit(false);
            try {
                work.run(con);
                con.commit();
            } catch (Exception e) {
                con.rollback();
                if (e instanceof ApiError) {
                    throw (ApiError) e;
                }
                if (e.getCause() instanceof ApiError) {
                    throw (ApiError) e.getCause();
                }
                throw new RuntimeException(e);
            } finally {
                con.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}