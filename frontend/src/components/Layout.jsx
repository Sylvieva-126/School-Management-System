import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiLogOut, FiActivity, FiUsers, FiBookOpen,
  FiDollarSign, FiCalendar, FiFileText, FiSend, FiShield, FiClock,FiKey
} from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const getLinks = () => {
    if (!user) return [];
    const r = user.role;
    const links = [];

    if (r === 'super_admin' || r === 'admin') {
      links.push({ to: '/admin/dashboard', icon: <FiActivity />, label: 'Dashboard' });
      links.push({ to: '/admin/sessions', icon: <FiCalendar />, label: 'Sessions & Terms' });
      links.push({ to: '/admin/classes', icon: <FiUsers />, label: 'Classes' });
//       links.push({ to: '/admin/subjects', icon: <FiBookOpen />, label: 'Subjects' });
      links.push({ to: '/admin/teachers', icon: <FiUsers />, label: 'Teachers' });
      links.push({ to: '/admin/students', icon: <FiUsers />, label: 'Students' });
      links.push({ to: '/admin/assignments', icon: <FiBookOpen />, label: 'Assignments' });
      links.push({ to: '/admin/fees', icon: <FiDollarSign />, label: 'Fees' });
      links.push({ to: '/admin/timetable', icon: <FiCalendar />, label: 'Timetable' });
      links.push({ to: '/admin/exams', icon: <FiFileText />, label: 'Exams' });
      links.push({ to: '/admin/report-cards', icon: <FiFileText />, label: 'Report Cards' });
      // links.push({ to: '/admin/broadcast', icon: <FiSend />, label: 'Broadcast' });
      // links.push({ to: '/admin/delivery-log', icon: <FiClock />, label: 'Delivery Log' });
      if (r === 'super_admin') {
        // links.push({ to: '/admin/manage-admins', icon: <FiShield />, label: 'Manage Admins' });
        links.push({ to: '/admin/activity-log', icon: <FiActivity />, label: 'Activity Log' });
      }
       } else if (r === 'teacher') {
         links.push({ to: '/teacher', icon: <FiActivity />, label: 'Home', end: true });
         links.push({ to: '/teacher/attendance', icon: <FiCalendar />, label: 'Mark Attendance' });
         links.push({ to: '/teacher/report-cards', icon: <FiFileText />, label: 'Report Cards' });
         // Covered by Home (classes + timetable shown inline) — uncomment if split out later:
         // links.push({ to: '/teacher/my-classes', icon: <FiUsers />, label: 'My Classes' });
         // links.push({ to: '/teacher/timetable', icon: <FiCalendar />, label: 'Timetable' });

    } else if (r === 'parent') {
      links.push({ to: '/parent', icon: <FiUsers />, label: 'My Children', end: true });
       } else if (r === 'student') {
         links.push({ to: '/student', icon: <FiActivity />, label: 'Home', end: true });
         // PENDING student sub-pages — Home already covers these; uncomment when built:
         // links.push({ to: '/student/report-cards', icon: <FiFileText />, label: 'Report Cards' });
         // links.push({ to: '/student/attendance', icon: <FiCalendar />, label: 'Attendance' });
         // links.push({ to: '/student/fees', icon: <FiDollarSign />, label: 'Fees' });
         // links.push({ to: '/student/timetable', icon: <FiCalendar />, label: 'Timetable' });
       }
    links.push({ to: '/change-password', icon: <FiKey />, label: 'Change Password' });

    return links;
  };

  return (
    <div className="layout-root">
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', fontWeight: 'bold', fontSize: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          School System
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          {getLinks().map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeSidebar}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.55rem 1.25rem',
                color: isActive ? 'var(--primary)' : 'var(--text)',
                backgroundColor: isActive ? 'var(--border)' : 'transparent',
                fontWeight: isActive ? '600' : '400'
              })}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn-ghost"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Menu"
              style={{ display: 'flex', padding: '0.5rem' }}
            >
              <FiMenu size={24} className="hamburger-icon" />
            </button>
            <span style={{ fontWeight: '500', display: 'none' }} className="desktop-title">
              Welcome, {user?.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle />
            <NotificationBell />
            <button className="btn-ghost" onClick={handleLogout} aria-label="Logout" style={{ display: 'flex', padding: '0.5rem' }}>
              <FiLogOut size={20} />
            </button>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
      <style>{`
        @media (min-width: 901px) {
          .hamburger-icon { display: none !important; }
          .desktop-title { display: inline !important; }
        }
      `}</style>
    </div>
  );
}