import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenExpired } from '../../utils/jwt.utils';

/**
 * AdminProtectedRoute
 * - Guards admin routes based on presence and validity of adminAccessToken
 * - Checks token expiration and admin role for better security
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

  // Check if token exists
  if (!adminAccessToken) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Check if token is expired
  if (isTokenExpired(adminAccessToken)) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Check if role is correct
  if (currentRole !== 'admin') {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Token is valid and role is correct - allow access
  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
};

export default AdminProtectedRoute;

