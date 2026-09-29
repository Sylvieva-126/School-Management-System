# Test Plan — Phase 4B: Fees, Timetable, Exams, Dashboard(add complleted messagge after completion)

**Author:** Harrietta
**Date:** [insert date after i complete the feature]

**Feature description (from the developer):**
The system tracks school fees per class, per term. The admin sets
a fee STRUCTURE (e.g. JSS 1A, First Term 2025/2026 = 25000).
Admitted students get an INVOICE automatically. Payments are
recorded and balances drop. The admin can bulk-generate invoices
for a whole class and send reminders to all parents whose
children owe money. Nothing can be paid on a CLOSED term. The
timetable refuses double-booking (same class OR same teacher at
overlapping times). Exams are created per class and subject with
a maximum score. The dashboard shows counts (students, teachers,
classes) and money totals for the active term.

## Test Cases — Fees

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-1 | Create a fee structure | POST /api/fees/structures | 200/201 success |
| F-2 | Record a valid payment | POST /api/fees/record-payment | 200, balance drops by paid amount |
| F-3 | Payment on a closed term | close term, then record payment | 400 "This term is closed." |
| F-4 | Zero payment | amount = 0 | 400 error |
| F-5 | Negative payment | amount = -500 | 400 error |
| F-6 | Generate invoices twice | run generate-invoices 2 times | no duplicate invoices second run |
| F-7 | Remind debtors | POST /api/fees/remind-debtors | only owing parents notified |
| F-8 | Payment notification | check deliveries after F-2 | PAYMENT_OK email/SMS logged |

## Test Cases — Timetable

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| T-1 | Book a valid slot | POST /api/timetable | 200/201 success |
| T-2 | Same class, overlapping time | book conflicting slot | 409 "Clash: this class or teacher is already booked at that time." |
| T-3 | Same teacher, overlapping time, different class | conflicting teacher booking | 409 "Clash: this class or teacher is already booked at that time." |

## Test Cases — Exams

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| E-1 | Create a valid exam | POST /api/exams | 200/201 + audit entry |

## Test Cases — Dashboard

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| D-1 | Numbers match database reality | compare dashboard values vs manual SQL | identical values |

## Notes
- [observations while testing]