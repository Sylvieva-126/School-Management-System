
-- Seed Academic Session
INSERT INTO academic_sessions (name, active)
SELECT '2025/2026', TRUE
WHERE NOT EXISTS (SELECT 1 FROM academic_sessions WHERE name = '2025/2026');

-- Seed Terms (First Term active)
INSERT INTO terms (session_id, name, active, closed)
SELECT id, 'First Term', TRUE, FALSE FROM academic_sessions WHERE name = '2025/2026'
AND NOT EXISTS (SELECT 1 FROM terms WHERE name = 'First Term' AND session_id = (SELECT id FROM academic_sessions WHERE name = '2025/2026'));

INSERT INTO terms (session_id, name, active, closed)
SELECT id, 'Second Term', FALSE, FALSE FROM academic_sessions WHERE name = '2025/2026'
AND NOT EXISTS (SELECT 1 FROM terms WHERE name = 'Second Term' AND session_id = (SELECT id FROM academic_sessions WHERE name = '2025/2026'));

INSERT INTO terms (session_id, name, active, closed)
SELECT id, 'Third Term', FALSE, FALSE FROM academic_sessions WHERE name = '2025/2026'
AND NOT EXISTS (SELECT 1 FROM terms WHERE name = 'Third Term' AND session_id = (SELECT id FROM academic_sessions WHERE name = '2025/2026'));

-- Seed Grading Scale
INSERT INTO grading_scale (min_score, max_score, grade, remark)
SELECT 75.00, 100.00, 'A', 'Excellent' WHERE NOT EXISTS (SELECT 1 FROM grading_scale WHERE grade = 'A');

INSERT INTO grading_scale (min_score, max_score, grade, remark)
SELECT 65.00, 74.99, 'B', 'Very Good' WHERE NOT EXISTS (SELECT 1 FROM grading_scale WHERE grade = 'B');

INSERT INTO grading_scale (min_score, max_score, grade, remark)
SELECT 55.00, 64.99, 'C', 'Good' WHERE NOT EXISTS (SELECT 1 FROM grading_scale WHERE grade = 'C');

INSERT INTO grading_scale (min_score, max_score, grade, remark)
SELECT 45.00, 54.99, 'D', 'Pass' WHERE NOT EXISTS (SELECT 1 FROM grading_scale WHERE grade = 'D');

INSERT INTO grading_scale (min_score, max_score, grade, remark)
SELECT 40.00, 44.99, 'E', 'Weak' WHERE NOT EXISTS (SELECT 1 FROM grading_scale WHERE grade = 'E');

INSERT INTO grading_scale (min_score, max_score, grade, remark)
SELECT 0.00, 39.99, 'F', 'Fail' WHERE NOT EXISTS (SELECT 1 FROM grading_scale WHERE grade = 'F');

-- Seed Sample Class
INSERT INTO classes (name)
SELECT 'JSS 1A' WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'JSS 1A');