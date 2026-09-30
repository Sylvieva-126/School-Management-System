CREATE TABLE teacher_attendance (
  id SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent')),
  UNIQUE (teacher_id, date)
);
GRANT SELECT, INSERT, UPDATE ON teacher_attendance TO school_app;
GRANT USAGE, SELECT ON SEQUENCE teacher_attendance_id_seq TO school_app;