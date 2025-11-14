import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * AdminProtectedRoute
 * - Guards admin routes based on presence of adminAccessToken and admin role
 * - Usage:
 *   <AdminProtectedRoute redirectTo="/admin">
 *     <AdminLayout />
 *   </AdminProtectedRoute>
 *   or with Outlet when used in a Route element wrapper
 */
const AdminProtectedRoute = ({ redirectTo = '/admin', children }) => {
  const location = useLocation();

  // Read admin auth from Redux
  const adminAuth = useSelector((state) => state?.adminAuth || {});
  
  // Get admin token and role
  const adminAccessToken = adminAuth?.adminAccessToken || '';
  const currentRole = adminAuth?.role || '';

  const isAuthed = Boolean(adminAccessToken);
  const roleAllowed = currentRole === 'admin';

  if (!isAuthed || !roleAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
}

export default AdminProtectedRoute;

