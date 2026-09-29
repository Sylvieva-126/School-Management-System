# Test Plan — Phase 3: Authentication (COMPLETED — worked example)

**Author:** Sylvieva
**Date:** 2026-09-29

**Feature description:**
Users log in with email/phone + password and receive a token.
Wrong passwords are rejected AND recorded. Too many failures lock
the door for 15 minutes. Changing password kills all other
sessions and sends a confirmation email.

## Test Cases 

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| AU-1 | Login correct credentials | POST /api/login, correct email + password | 200 + token + role super_admin | 200 + token + super_admin | PASS |
| AU-2 | Login wrong password | POST /api/login, wrong password | 401 "Invalid credentials" | 401 + LOGIN_FAILED row in audit log | PASS |
| AU-3 | Rate limit after 5 failures | 5 wrong logins, then try again | 429 "Too many failed attempts" | 429 "Too many failed attempts. Please try again in 15 minutes." | PASS |
| AU-4 | Change password | POST /api/change-password, old + new password | 200, old token dies (401 after) | 200, old token returned 401 afterwards | PASS |
| AU-5 | Password-change notification | check server console after AU-4 | mock email printed | MOCK EMAIL printed | PASS |

## Notes
- Failed logins correctly appear in audit_logs with status "blocked"