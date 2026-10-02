import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RoleRoute from './routes/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Activate from './pages/Activate';
import ChangePassword from './pages/ChangePassword';

// Inline placeholders for pages to be built in 9B and 9C
// This ensures the app is fully runnable right now without Vite crashing.
const Placeholder = ({ title }) => (
  <div className="card">
    <h2>{title}</h2>
    <p className="text-muted" style={{ marginTop: '1rem' }}>This module will be implemented in the next phase.</p>
  </div>
);

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
              <RoleRoute><ChangePassword /></RoleRoute>
            } />

            {/* ADMIN WING */}
            <Route path="/admin" element={<RoleRoute roles={['admin', 'super_admin']}><Layout /></RoleRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Placeholder title="Admin Dashboard" />} />
              <Route path="sessions" element={<Placeholder title="Sessions & Terms" />} />
              <Route path="classes" element={<Placeholder title="Classes" />} />
              <Route path="subjects" element={<Placeholder title="Subjects" />} />
              <Route path="assignments" element={<Placeholder title="Teacher Assignments" />} />
              <Route path="teachers" element={<Placeholder title="Teachers" />} />
              <Route path="students" element={<Placeholder title="Students" />} />
              <Route path="fees" element={<Placeholder title="Fees Management" />} />
              <Route path="timetable" element={<Placeholder title="Timetable" />} />
              <Route path="exams" element={<Placeholder title="Exams" />} />
              <Route path="results" element={<Placeholder title="Results" />} />
              <Route path="promotion" element={<Placeholder title="Promotion" />} />
              <Route path="broadcast" element={<Placeholder title="Broadcast" />} />
              <Route path="delivery-log" element={<Placeholder title="Delivery Log" />} />
              {/* SUPER ADMIN ONLY */}
              <Route path="manage-admins" element={<RoleRoute roles={['super_admin']}><Placeholder title="Manage Admins" /></RoleRoute>} />
              <Route path="activity-log" element={<RoleRoute roles={['super_admin']}><Placeholder title="Activity Log" /></RoleRoute>} />
            </Route>

            {/* TEACHER WING */}
            <Route path="/teacher" element={<RoleRoute roles={['teacher']}><Layout /></RoleRoute>}>
              <Route index element={<Placeholder title="Teacher Home" />} />
              <Route path="my-classes" element={<Placeholder title="My Classes" />} />
              <Route path="attendance" element={<Placeholder title="Mark Attendance" />} />
              <Route path="scores" element={<Placeholder title="Enter Scores" />} />
              <Route path="timetable" element={<Placeholder title="My Timetable" />} />
            </Route>

            {/* PARENT WING */}
            <Route path="/parent" element={<RoleRoute roles={['parent']}><Layout /></RoleRoute>}>
              <Route index element={<Placeholder title="My Children" />} />
              <Route path="child/:id/results" element={<Placeholder title="Child Results" />} />
              <Route path="child/:id/fees" element={<Placeholder title="Child Fees" />} />
            </Route>

            {/* STUDENT WING */}
            <Route path="/student" element={<RoleRoute roles={['student']}><Layout /></RoleRoute>}>
              <Route index element={<Placeholder title="Student Home" />} />
              <Route path="results" element={<Placeholder title="My Results" />} />
              <Route path="attendance" element={<Placeholder title="My Attendance" />} />
              <Route path="fees" element={<Placeholder title="My Fees" />} />
              <Route path="timetable" element={<Placeholder title="My Timetable" />} />
            </Route>

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}