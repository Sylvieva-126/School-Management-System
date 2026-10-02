# Test Plan — Phase 6: Results Engine + Promotion (COMPLETED)

**Author:** Sylvieva
**Date:** 2026-10-01

**Feature description:**
The results engine computes totals, averages, grades (A-F from the
grading scale), and class positions (1st, 2nd, 3rd) for every
student who has scores in an exam. Admin publishes results, which
notifies every linked parent and locks scores from editing until
unlocked. Promotion moves students between classes based on pass
or fail (mode "all" or "passed" with PASS_MARK from .env).
Graduation marks students as graduated and deactivates their
accounts.

## Test Cases — Compute Results

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| C-1 | Compute results for exam 1 | POST /api/results/compute/1 | totals, averages, grades, positions match manual math | Tunde(2)=100/A/pos1, Remi(3)=62/C/pos2, Tunde(1)=55/C/pos3 — matches manual | PASS |
| C-2 | Results stored in DB | SQL verify after compute | rows in results table with correct values | 3 rows, values match | PASS |

Manual math check: scores were edited during testing (student 1:
75→55, student 2: 88→100) so averages reflect the edited scores.

## Test Cases — Publish + Lock

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| P-1 | Publish results | POST /api/results/publish/1 | 200, published=TRUE, parents notified | 200, 3 RESULTS_OUT mock messages to correct parents | PASS |
| P-2 | Edit score after publish | teacher tries to edit score | 403 "Results are locked. Ask an admin to unlock them." | 403, correct message | PASS |
| P-3 | Unlock results | POST /api/results/unlock/1 | 200, published=FALSE | 200, RESULTS_UNLOCKED in audit | PASS |
| P-4 | Republish (dedup check) | unlock, recompute, republish same day | parents NOT re-notified (dedup) | console did NOT send duplicate messages, RESULTS_PUBLISHED in audit each time | PASS (dedup working) |

Note on republish: the console did not send duplicate RESULTS_OUT
messages because the dedup rule (user_id + event per calendar day)
prevented re-notification. This is correct behavior — parents
shouldn't get spammed on the same day.

## Test Cases — Promotion

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| PR-1 | Promote mode "passed" | POST /api/promotion/run {fromClassId:1, toClassId:2, mode:"passed"} | only students with average >= PASS_MARK promoted | promotedCount:0, retainedCount:2 — see bug analysis below | ⚠️ |
| PR-2 | Graduate students | POST /api/promotion/graduate/{classId} | graduated=TRUE, users.active=FALSE | 200 "6 students graduated successfully" | PASS |
| PR-3 | Audit rows exist | check audit_logs for STUDENTS_PROMOTED and STUDENTS_GRADUATED | rows present | rows present (confirmed after fixing trailing-space query) | PASS |

## Bug Found During Testing

| Bug | Description | Root cause | Fix |
|-----|-------------|-----------|-----|
| PR-1 returned promotedCount:0 | the promotion found 2 students but promoted neither despite averages >= 40 | the handler's average lookup or comparison logic needs investigation — scores existed, results were computed and published, PASS_MARK is 40 | B3 rescue sent to Gemini with full debug info — awaiting corrected file |

Note: the promotion test was run BEFORE the graduation test, so
graduated students were NOT the cause. The students had valid
published averages (55, 62, 100) all above PASS_MARK (40).

## Audit Query Fix

The original audit query had a trailing space in the WHERE clause:
WHERE action = ' STUDENTS_PROMOTED '
This returned no rows because the space prevented the match.
Corrected to:
WHERE action = 'STUDENTS_PROMOTED'
Result: 3 STUDENTS_PROMOTED rows confirmed 