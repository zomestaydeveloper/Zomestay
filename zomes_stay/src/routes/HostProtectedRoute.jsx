import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * HostProtectedRoute
 * - Guards host routes based on presence of hostAccessToken and host role
 * - Usage:
 *   <HostProtectedRoute redirectTo="/host">
 *     <HostLayout />
 *   </HostProtectedRoute>
 *   or with Outlet when used in a Route element wrapper
 */
const HostProtectedRoute = ({ redirectTo = '/host', children }) => {
  const location = useLocation();

  // Read host auth from Redux
  const hostAuth = useSelector((state) => state?.hostAuth || {});
  
  // Get host token and role
  const hostAccessToken = hostAuth?.hostAccessToken || '';
  const currentRole = hostAuth?.role || '';

  const isAuthed = Boolean(hostAccessToken);
  const roleAllowed = currentRole === 'host';

  if (!isAuthed || !roleAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
}

export default HostProtectedRoute;

