// src/App.jsx — every route, guarded by role, remounted on user change.
// BrowserRouter key={sessionKey}: login/logout bumps sessionKey ->
// the entire router remounts -> no page state leaks between users. (her spec)
//
// NOTE: pages not built yet render <Soon /> placeholders. As each real
// page lands (Tier 1/2), its import replaces the placeholder — one line.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import RoleRoute from './routes/RoleRoute';
import Login from './pages/Login';
import Activate from './pages/Activate';
import ChangePassword from './pages/ChangePassword';

// Temporary stand-in for pages we haven't generated yet.
function Soon({ title }) {
  return (
    <div className="center-page">
      <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
        <h2>{title}</h2>
        <p className="text-muted">This page is next in the build order.</p>
      </div>
    </div>
  );
}

// "/" sends each role to its own home; logged-out -> /login.
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  if (user.role === 'parent') return <Navigate to="/parent" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const { sessionKey } = useAuth();

  return (
    <BrowserRouter key={sessionKey}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<Activate />} />

        {/* App shell */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/change-password" element={<RoleRoute><ChangePassword /></RoleRoute>} />

          {/* Admin wing */}
          <Route path="/admin/dashboard" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Dashboard" /></RoleRoute>} />
          <Route path="/admin/sessions" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Sessions & Terms" /></RoleRoute>} />
          <Route path="/admin/students" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Students" /></RoleRoute>} />
          <Route path="/admin/teachers" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Teachers" /></RoleRoute>} />
          <Route path="/admin/fees" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Fees" /></RoleRoute>} />
          <Route path="/admin/report-cards" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Report Cards" /></RoleRoute>} />
          <Route path="/admin/exams" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Exams" /></RoleRoute>} />
          <Route path="/admin/classes" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Classes" /></RoleRoute>} />
          <Route path="/admin/subjects" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Subjects" /></RoleRoute>} />
          <Route path="/admin/assignments" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Assignments" /></RoleRoute>} />
          <Route path="/admin/timetable" element={<RoleRoute roles={['admin', 'super_admin']}><Soon title="Timetable" /></RoleRoute>} />

          {/* Teacher wing */}
          <Route path="/teacher" element={<RoleRoute roles={['teacher']}><Soon title="Teacher Home" /></RoleRoute>} />
          <Route path="/teacher/attendance" element={<RoleRoute roles={['teacher']}><Soon title="Mark Attendance" /></RoleRoute>} />
          <Route path="/teacher/report-cards" element={<RoleRoute roles={['teacher']}><Soon title="Report Cards" /></RoleRoute>} />

          {/* Student & Parent */}
          <Route path="/student" element={<RoleRoute roles={['student']}><Soon title="Student Portal" /></RoleRoute>} />
          <Route path="/parent" element={<RoleRoute roles={['parent']}><Soon title="Parent Portal" /></RoleRoute>} />
        </Route>

        {/* Unknown URL -> home (which redirects by role) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}