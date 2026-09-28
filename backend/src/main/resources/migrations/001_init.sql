
CREATE TABLE users (
  id SERIAL PRIMARY KEY, full_name TEXT NOT NULL,
  phone TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','teacher','parent','student')),
  must_change_password BOOLEAN DEFAULT TRUE, active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE session_tokens (
  token TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activation_tokens (
  token TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN DEFAULT FALSE
);

CREATE TABLE academic_sessions (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, active BOOLEAN DEFAULT FALSE
);

CREATE TABLE terms (
  id SERIAL PRIMARY KEY, session_id INT REFERENCES academic_sessions(id),
  name TEXT NOT NULL, active BOOLEAN DEFAULT FALSE, closed BOOLEAN DEFAULT FALSE
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  class_teacher_id INT REFERENCES users(id)
);

CREATE TABLE subjects (id SERIAL PRIMARY KEY, name TEXT NOT NULL);

CREATE TABLE teacher_assignments (
  id SERIAL PRIMARY KEY, teacher_id INT REFERENCES users(id),
  class_id INT REFERENCES classes(id), subject_id INT REFERENCES subjects(id),
  UNIQUE (teacher_id, class_id, subject_id)
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY, user_id INT UNIQUE REFERENCES users(id),
  admission_no TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL,
  class_id INT REFERENCES classes(id),
  current_session_id INT REFERENCES academic_sessions(id),
  graduated BOOLEAN DEFAULT FALSE
);

CREATE TABLE parent_links (
  parent_user_id INT REFERENCES users(id), student_id INT REFERENCES students(id),
  PRIMARY KEY (parent_user_id, student_id)
);

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY, student_id INT REFERENCES students(id),
  class_id INT REFERENCES classes(id), date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  marked_by INT REFERENCES users(id), UNIQUE (student_id, date)
);

CREATE TABLE exams (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, term_id INT REFERENCES terms(id),
  class_id INT REFERENCES classes(id), subject_id INT REFERENCES subjects(id),
  max_score NUMERIC(5,2) DEFAULT 100, published BOOLEAN DEFAULT FALSE,
  created_by INT REFERENCES users(id)
);

CREATE TABLE scores (
  id SERIAL PRIMARY KEY, exam_id INT REFERENCES exams(id),
  student_id INT REFERENCES students(id), score NUMERIC(5,2) NOT NULL,
  entered_by INT REFERENCES users(id), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE TABLE grading_scale (
  id SERIAL PRIMARY KEY, min_score NUMERIC(5,2), max_score NUMERIC(5,2),
  grade TEXT, remark TEXT
);

CREATE TABLE results (
  id SERIAL PRIMARY KEY, exam_id INT REFERENCES exams(id),
  student_id INT REFERENCES students(id),
  total NUMERIC(6,2), average NUMERIC(5,2), grade TEXT, position INT,
  UNIQUE (exam_id, student_id)
);

CREATE TABLE fee_structures (
  id SERIAL PRIMARY KEY, class_id INT REFERENCES classes(id),
  term_id INT REFERENCES terms(id), amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY, student_id INT REFERENCES students(id),
  term_id INT REFERENCES terms(id), amount NUMERIC(10,2), balance NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY, invoice_id INT REFERENCES invoices(id),
  amount NUMERIC(10,2), recorded_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE timetable (
  id SERIAL PRIMARY KEY, class_id INT REFERENCES classes(id),
  teacher_id INT REFERENCES users(id), subject_id INT REFERENCES subjects(id),
  day_of_week TEXT NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
  title TEXT NOT NULL, body TEXT NOT NULL, type TEXT NOT NULL, link TEXT,
  is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE notification_deliveries (
  id BIGSERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
  channel TEXT NOT NULL, event TEXT NOT NULL, recipient TEXT NOT NULL,
  status TEXT NOT NULL, error TEXT, attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY, actor_id INT, actor_role TEXT, action TEXT NOT NULL,
  target_type TEXT, target_id INT, old_value JSONB, new_value JSONB,
  ip_address TEXT, status TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);

-- correct order at the end of 001_init.sql:
GRANT USAGE ON SCHEMA public TO school_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO school_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO school_app;
-- THE PERMANENT PEN — must come AFTER the big GRANT above:
REVOKE UPDATE, DELETE ON audit_logs FROM school_app;
GRANT SELECT, INSERT ON audit_logs TO school_app;