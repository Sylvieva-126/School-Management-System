package school.db;

import org.mindrot.jbcrypt.BCrypt;
import school.config.Database;
import school.config.Env;

import java.util.Map;

public class SeedDatabase {
    public static void main(String[] args) {
        System.out.println("=== Connecting to: " + Env.get("DB_URL"));
        System.out.println("=== As user: " + Env.get("DB_USER"));


        System.out.println("Checking for existing super_admin...");
        Map<String, Object> result = Database.queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'");

        long count = ((Number) result.get("count")).longValue();
        if (count > 0) {
            System.out.println("Super admin already exists. Skipping seed.");
            return;
        }

        System.out.println("No super_admin found. Creating initial super_admin...");

        String name = Env.get("SEED_ADMIN_NAME");
        String phone = Env.get("SEED_ADMIN_PHONE");
        String email = Env.get("SEED_ADMIN_EMAIL");
        String password = Env.get("SEED_ADMIN_PASSWORD");

        String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt(12));

        String sql = "INSERT INTO users (full_name, phone, email, password_hash, role, must_change_password, active) " +
                "VALUES (?, ?, ?, ?, 'super_admin', TRUE, TRUE)";

        Database.update(sql, name, phone, email, hashedPassword);

        System.out.println("Initial super_admin created successfully.");
    }
}