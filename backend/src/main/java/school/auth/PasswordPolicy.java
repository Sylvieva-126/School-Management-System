// src/main/java/school/auth/PasswordPolicy.java
package school.auth;

import school.http.ApiError;

public class PasswordPolicy {

    /**
     * Enforces: min 8 chars, at least one uppercase, one lowercase,
     * one digit, and one special character. Throws ApiError(400) if violated.
     * Used by: account activation, password reset (forgot password), change password.
     */
    public static void validate(String password) {
        if (password == null || password.length() < 8) {
            throw new ApiError(400, "Password must be at least 8 characters");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new ApiError(400, "Password must contain at least one uppercase letter");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new ApiError(400, "Password must contain at least one lowercase letter");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new ApiError(400, "Password must contain at least one number");
        }
        if (!password.matches(".*[^A-Za-z0-9].*")) {
            throw new ApiError(400, "Password must contain at least one special character (e.g. !@#$%)");
        }
    }
}