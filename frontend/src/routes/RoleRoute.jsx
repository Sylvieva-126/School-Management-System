// src/routes/RoleRoute.jsx — the security guard for protected pages.
// No user -> /login. Wrong role -> "/" (HomeRedirect sends them to their own home).
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}