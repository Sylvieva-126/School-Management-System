// src/components/Layout.jsx — the app shell: sidebar per role + topbar.
// Rendered as the PARENT route in App.jsx; pages appear via <Outlet />.
// Design notes from screenshots:
//   - brand "School System" (white, border-bottom) — CSS .sidebar > div:first-child
//   - active nav item = green pill — CSS .sidebar nav a.active
//   - topbar: "Welcome, {name}" left · ThemeToggle + NotificationBell + Logout right
//   - Change Password pinned at the bottom of the sidebar, for every role
import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FaBars, FaSignOutAlt, FaHome, FaChartPie, FaCalendarCheck, FaCalendarAlt,
  FaUsers, FaBookOpen, FaChalkboardTeacher, FaUserGraduate, FaClipboardList,
  FaDollarSign, FaFileAlt, FaChild, FaKey,
} from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

// Is the window phone-width? (CSS hides the sidebar under 900px)
function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const fn = (e) => setM(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return m;
}

const adminLinks = [
  { to: '/admin/dashboard', icon: FaChartPie, label: 'Dashboard' },
  { to: '/admin/sessions', icon: FaCalendarCheck, label: 'Sessions & Terms' },
  { to: '/admin/classes', icon: FaUsers, label: 'Classes' },
  { to: '/admin/subjects', icon: FaBookOpen, label: 'Subjects' },
  { to: '/admin/teachers', icon: FaChalkboardTeacher, label: 'Teachers' },
  { to: '/admin/students', icon: FaUserGraduate, label: 'Students' },
  { to: '/admin/assignments', icon: FaClipboardList, label: 'Assignments' },
  { to: '/admin/fees', icon: FaDollarSign, label: 'Fees' },
  { to: '/admin/timetable', icon: FaCalendarAlt, label: 'Timetable' },
  { to: '/admin/exams', icon: FaFileAlt, label: 'Exams' },
  { to: '/admin/report-cards', icon: FaFileAlt, label: 'Report Cards' },
  // [P3] nav commented out until built:
  // { to: '/admin/manage-admins', icon: FaUserShield, label: 'Manage Admins' },
  // { to: '/admin/activity-log', icon: FaHistory, label: 'Activity Log' },
];

const teacherLinks = [
  { to: '/teacher', icon: FaHome, label: 'Home', end: true },
  { to: '/teacher/attendance', icon: FaCalendarCheck, label: 'Mark Attendance' },
  { to: '/teacher/report-cards', icon: FaFileAlt, label: 'Report Cards' },
];

const studentLinks = [
  { to: '/student', icon: FaHome, label: 'Home', end: true },
];

const parentLinks = [
  { to: '/parent', icon: FaChild, label: 'My Children', end: true },
];

function linksForRole(role) {
  if (role === 'admin' || role === 'super_admin') return adminLinks;
  if (role === 'teacher') return teacherLinks;
  if (role === 'student') return studentLinks;
  if (role === 'parent') return parentLinks;
  return [];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = linksForRole(user?.role);

  function handleLogout() {
    logout(); // sessionKey changes -> App remounts everything -> /login
  }

  return (
    <div className="layout-root">
      {/* Click-away shadow behind the mobile drawer */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${isMobile && sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.1rem 1.25rem', fontWeight: 700, fontSize: '1.15rem' }}>
          School System
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.75rem' }}
              onClick={() => setSidebarOpen(false)} // tapping a link closes the mobile drawer
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <nav style={{ paddingBottom: '1rem' }}>
          <NavLink
            to="/change-password"
            className={({ isActive }) => (isActive ? 'active' : '')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.75rem' }}
            onClick={() => setSidebarOpen(false)}
          >
            <FaKey />
            Change Password
          </NavLink>
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isMobile && (
              <button className="btn-ghost" style={{ padding: '0.4rem 0.6rem' }} onClick={() => setSidebarOpen(true)}>
                <FaBars />
              </button>
            )}
            <span style={{ fontWeight: 500 }}>Welcome, {user?.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ThemeToggle />
            <NotificationBell />
            <button className="btn-ghost" style={{ padding: '0.4rem 0.6rem' }} title="Logout" onClick={handleLogout}>
              <FaSignOutAlt />
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}