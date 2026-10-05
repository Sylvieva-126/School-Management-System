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


const Placeholder = ({ title }) => (
  <div className="card">
    <h2>{title}</h2>
    <p className="text-muted" style={{ marginTop: '1rem' }}>This module will be implemented in the next phase.</p>
  </div>
);

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const r = user.role;
  if (r === 'admin' || r === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  if (r === 'teacher') return <Navigate to="/teacher" replace />;
  if (r === 'parent') return <Navigate to="/parent" replace />;
  if (r === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC ROUTES */}
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
               <Route path="sessions" element={<Placeholder title="Sessions & Terms" />} />
              <Route path="classes" element={<Placeholder title="Classes" />} />
              <Route path="subjects" element={<Placeholder title="Subjects" />} />
              <Route path="assignments" element={<Placeholder title="Teacher Assignments" />} />
                <Route path="teachers" element={<Teachers />} />
                 <Route path="students" element={<Students />} />
              <Route path="fees" element={<Placeholder title="Fees Management" />} />
              <Route path="timetable" element={<Placeholder title="Timetable" />} />
              <Route path="exams" element={<Placeholder title="Exams" />} />
              <Route path="report-cards" element={<Placeholder title="Report Cards" />} />
              <Route path="broadcast" element={<Placeholder title="Broadcast" />} />
              <Route path="delivery-log" element={<Placeholder title="Delivery Log" />} />
              <Route path="manage-admins" element={<RoleRoute roles={['super_admin']}><Placeholder title="Manage Admins" /></RoleRoute>} />
              <Route path="activity-log" element={<RoleRoute roles={['super_admin']}><Placeholder title="Activity Log" /></RoleRoute>} />
            </Route>

            {/* TEACHER WING */}
            <Route path="/teacher" element={<RoleRoute roles={['teacher']}><Layout /></RoleRoute>}>
              <Route index element={<Placeholder title="Teacher Home" />} />
              <Route path="my-classes" element={<Placeholder title="My Classes" />} />
              <Route path="attendance" element={<Placeholder title="Mark Attendance" />} />
              <Route path="report-cards" element={<Placeholder title="Upload Report Cards" />} />
              <Route path="timetable" element={<Placeholder title="My Timetable" />} />
            </Route>

            {/* PARENT WING */}
            <Route path="/parent" element={<RoleRoute roles={['parent']}><Layout /></RoleRoute>}>
              <Route index element={<Placeholder title="My Children" />} />
              <Route path="child/:id/report-cards" element={<Placeholder title="Child Report Cards" />} />
              <Route path="child/:id/fees" element={<Placeholder title="Child Fees" />} />
            </Route>

            {/* STUDENT WING */}
            <Route path="/student" element={<RoleRoute roles={['student']}><Layout /></RoleRoute>}>
              <Route index element={<Placeholder title="Student Home" />} />
              <Route path="report-cards" element={<Placeholder title="My Report Cards" />} />
              <Route path="attendance" element={<Placeholder title="My Attendance" />} />
              <Route path="fees" element={<Placeholder title="My Fees" />} />
              <Route path="timetable" element={<Placeholder title="My Timetable" />} />
            </Route>

            {/* HOME: redirect by role */}
            <Route path="/" element={<HomeRedirect />} />

            {/* FALLBACK: unknown URLs go home, not to login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}