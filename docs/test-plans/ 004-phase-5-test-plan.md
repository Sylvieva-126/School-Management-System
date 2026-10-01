# Test Plan — Phase 5: Attendance + Scores + Teacher Self-Attendance (COMPLETED)

**Author:** Sylvieva
**Date:** 2026-10-01

**Feature description:**
Teachers mark daily class attendance (present/absent/late) with
automatic parent SMS alerts on absence (deduplicated per student
per day). Teachers enter exam scores with validation (range,
class membership, subject ownership). Scores freeze after
publishing. Teachers mark THEMSELVES present daily (staff
register). Percentage stats use one shared helper across all
endpoints.

## Test Cases — Student Attendance

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| AT-1 | Mark 3 students (present/absent/late) | POST /api/attendance, valid body | 200, 3 rows in DB, ABSENCE SMS for absent student | 200 + ABSENCE SMS fired + 3 rows in DB | PASS |
| AT-2 | Upsert same day | re-mark same students | 200, still 3 rows (updated not duplicated) | 200, student 1 changed to late, no duplicate | PASS |
| AT-3 | Absence dedup | re-mark same student absent same day | no new SMS | no new SMS, dedup fired | PASS |
| AT-4 | Sibling SMS separation | mark student 4 (Jones) absent | new SMS for Jones's parent | new SMS fired for correct parent | PASS |
| AT-5 | FK guard on bad student id | studentId 999 | 400 "Student with id 999 does not exist" | 500 (BUG: ApiError wrapped in transaction) | FAIL → FIXED |
| AT-6 | Invalid status rejected | status "here" | 400 "Invalid status: here" | 500 (BUG: same wrapping issue) | FAIL → FIXED |
| AT-7 | Percentage math | GET /api/attendance/class/1/percentage | per-student % matching manual SQL | all 4 students, math verified | PASS |
| AT-8 | Ownership wall (unassigned teacher) | Mrs. Bisi marks class 1 | 403 "This is not your class" | 403 + blocked audit row | PASS |
| AT-9 | Closed term guard | term closed, then mark attendance | 400 "This term is closed." | 400 + TERM_CLOSED audit | PASS |

## Test Cases — Scores

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| SC-1 | Valid score entry | POST /api/scores, score 75 | 200 + SCORE_ENTRY audit | 200 + audit | PASS |
| SC-2 | Second student entry | score 88 | 200 | 200 | PASS |
| SC-3 | Over max rejected | score 120 | 400 "Score must be between 0 and 100" | 400 | PASS |
| SC-4 | Student from another class | outsider student id | 400 "Student is not in this exam's class." | 400 | PASS |
| SC-5 | Wrong subject teacher | Bisi scores Maths exam | 403 "This is not your subject/class" | 403 | PASS |
| SC-6 | Score edit evidence | change 75 to 55 | 200 + SCORE_EDIT audit with old/new | old {"score":75} new {"score":55} | PASS |

## Test Cases — Teacher Self-Attendance

| ID | Test Case | Steps | Expected | Actual | Result |
|----|-----------|-------|----------|--------|--------|
| TA-1 | Mark self present | POST /api/teacher-attendance/mark | 200, row for today | 200 + audit TEACHER_SELF_MARKED | PASS |
| TA-2 | Idempotent re-mark | mark again same day | update, not duplicate | one row per teacher per day | PASS |
| TA-3 | Admin summary | GET summary endpoint | per-teacher counts + % | correct counts | PASS |
| TA-4 | Admin today view | GET today endpoint | who marked, who hasn't | correct | PASS |
| TA-5 | Role wall | student token on mark endpoint | 403 | 403 | PASS |

## Bugs Found & Fixed During Testing

| Bug # | Description | Root cause | Fix | Verified |
|-------|-------------|-----------|-----|----------|
| 1 | ApiError inside transaction lambda → 500 instead of 400 | Database.transaction() wraps all exceptions in RuntimeException; SecureHandler didn't recognize the cause | Unwrapping added to Database.transaction() catch + all handler catch blocks | YES |
| 2 | "Invalid JSON body" on invalid status test | test request JSON was malformed, not a server bug | corrected test request | YES |
| 3 | /activate returns 404 in browser | no frontend page exists yet (Phase 9) — activation works via POST /api/activate in Postman | deferred to Phase 9A (frontend) | EXPECTED |

## Observations

- Student attendance SMS dedup works per student per day
- Sibling SMS separation works (different children, same parent)
- Teacher self-attendance uses server date automatically (no client date input)
- The audit log now has 120+ entries covering every action type
- All error messages return clean 400/403 instead of raw 500s