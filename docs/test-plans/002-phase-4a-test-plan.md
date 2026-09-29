# Test Plan — Phase 4A: Guardrails + People (COMPLETED — worked example)

**Author:** Sylvieva
**Date:** 2026-09-29

**Feature description:**
Admin accounts are managed under four security guardrails: only
Super Admins enter the admin room (G1), the last admin cannot be
removed (G2), nobody removes their own account (G3), and every
action plus every blocked attempt is permanently recorded (G4).
Teachers are created with one-time activation links. Admitting a
student auto-creates or links the parent account by phone
(siblings share one parent) and auto-generates an admission
number. Terms can be closed, locking all score and payment
writes.

## Test Cases 

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| G1-1 | Teacher attacks admin room | teacher token, POST /api/admins/demote/1 | 403 forbidden | 403 + blocked audit row | PASS |
| G1-2 | Regular admin attacks admin room | admin token, POST /api/admins/demote/1 | 403 | 403 + blocked audit row | PASS |
| G3-1 | Self-removal attempt | super admin demotes own id | 400 refusal | 400 "You cannot remove your own account." | PASS |
| G4-1 | Promotion recorded | promote teacher to admin | 200 + audit row old/new roles | PROMOTE_ADMIN success | PASS |
| G4-2 | Demotion recorded | demote admin | 200 + audit old/new roles | DEMOTE_ADMIN success | PASS |
| ST-1 | Create teacher | POST /api/teachers | 201 + activation link | link printed, password_hash NULL | PASS |
| ST-2 | Activate teacher | POST /api/activate with link token | 200, login works | activated + login succeeded | PASS |
| ST-3 | Admit student | POST /api/students | 201 + auto admission number | 2026-0001 format | PASS |
| ST-4 | Sibling linking | admit 2nd child, same parent phone | same parentUserId | SAME parent id | PASS |
| TM-1 | Close a term | POST /api/terms/close/1 | 200 + audit TERM_CLOSED | success | PASS |

## Notes
- G2 (last admin) logic confirmed in code; exact message tested in Phase 11