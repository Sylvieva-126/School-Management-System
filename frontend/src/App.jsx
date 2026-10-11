import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import RoleRoute from './routes/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Activate from './pages/Activate';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Fees from './pages/admin/Fees';
import ReportCards from './pages/shared/ReportCards';
import Exams from './pages/admin/Exams';
import Academics from './pages/admin/Academics';
import TimetablePage from './pages/admin/Timetable';
import SessionsTerms from './pages/admin/SessionsTerms';
import Assignments from './pages/admin/Assignments';
import StudentPortal from './pages/student/StudentPortal';
import ParentPortal from './pages/parent/ParentPortal';
import TeacherHome from './pages/teacher/TeacherHome';
import MarkAttendance from './pages/teacher/MarkAttendance';
import ActivityLog from './pages/admin/ActivityLog';
import Landing from './pages/Landing';





const Placeholder = ({ title }) => (
  <div className="card">
    <h2>{title}</h2>
    <p className="text-muted" style={{ marginTop: '1rem' }}>This module will be implemented in the next phase.</p>
  </div>
);

function Home() {
  const { user } = useAuth();
  if (user) {                                          // logged in → role home
    const r = user.role;
    if (r === 'admin' || r === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (r === 'teacher') return <Navigate to="/teacher" replace />;
    if (r === 'parent') return <Navigate to="/parent" replace />;
    if (r === 'student') return <Navigate to="/student" replace />;
  }
  return <Landing />;                                  // anonymous → landing
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
                      {/* PUBLIC ROUTES */}
                      <Route path="/" element={<Home />} />      {/* ← the ONLY "/" route */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/activate" element={<Activate />} />

                     {/* ANY LOGGED-IN ROLE */}
                     <Route path="/change-password" element={
                       <RoleRoute><Layout /></RoleRoute>
                     }>
                       <Route index element={<ChangePassword />} />
                     </Route>
                    {/* ADMIN WING */}
                    <Route path="/admin" element={<RoleRoute roles={['admin', 'super_admin']}><Layout /></RoleRoute>}>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="sessions" element={<SessionsTerms />} />
                      <Route path="classes" element={<Academics />} />
                      <Route path="assignments" element={<Assignments />} />
                      <Route path="timetable" element={<TimetablePage />} />
                      <Route path="teachers" element={<Teachers />} />
                      <Route path="students" element={<Students />} />
                      <Route path="fees" element={<Fees />} />
                      <Route path="exams" element={<Exams />} />
                      <Route path="report-cards" element={<ReportCards />} />
                      <Route path="activity-log" element={<RoleRoute roles={['super_admin']}><ActivityLog /></RoleRoute>} />
                    </Route>

                     {/* TEACHER WING */}
                     <Route path="/teacher" element={<RoleRoute roles={['teacher']}><Layout /></RoleRoute>}>
                       <Route index element={<TeacherHome />} />
                       <Route path="attendance" element={<MarkAttendance />} />
                       <Route path="report-cards" element={<ReportCards />} />
                       {/* Covered by TeacherHome — uncomment if split out later:
                       <Route path="my-classes" element={<Placeholder title="My Classes" />} />
                       <Route path="timetable" element={<Placeholder title="My Timetable" />} />
                       */}
                     </Route>

            {/* PARENT WING */}
            <Route path="/parent" element={<RoleRoute roles={['parent']}><Layout /></RoleRoute>}>
                <Route index element={<ParentPortal />} />
                  <Route path="child/:id/report-cards" element={<Placeholder title="Child Report Cards" />} />
              <Route path="child/:id/fees" element={<Placeholder title="Child Fees" />} />
            </Route>

            {/* STUDENT WING */}
            <Route path="/student" element={<RoleRoute roles={['student']}><Layout /></RoleRoute>}>
<Route index element={<StudentPortal />} />
              <Route path="report-cards" element={<Placeholder title="My Report Cards" />} />
              <Route path="attendance" element={<Placeholder title="My Attendance" />} />
              <Route path="fees" element={<Placeholder title="My Fees" />} />
              <Route path="timetable" element={<Placeholder title="My Timetable" />} />
            </Route>

{/*              */}{/* HOME: redirect by role */}
{/*             <Route path="/" element={<HomeRedirect />} /> */}

            {/* FALLBACK: unknown URLs go home, not to login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}