import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenExpired } from '../../utils/jwt.utils';

/**
 * HostProtectedRoute
 * - Guards host routes based on presence and validity of hostAccessToken
 * - Checks token expiration and host role for better security
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

<<<<<<< HEAD:zomes_stay/src/routes/HostProtectedRoute.jsx
  const isAuthed = Boolean(hostAccessToken);
  const roleAllowed = currentRole === 'host';

  if (!isAuthed || !roleAllowed) {
    console.log("HostProtectedRoute: Redirecting to login", {
      isAuthed,
      roleAllowed,
      hostAccessToken: !!hostAccessToken,
      currentRole,
      hostAuth
    });
=======
  // Check if token exists
  if (!hostAccessToken) {
>>>>>>> 385cf3dc7ca16452b0928d215cd9f369b11c8bbc:zomes_stay/src/routes/ProtectedRoute/HostProtectedRoute.jsx
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Check if token is expired
  if (isTokenExpired(hostAccessToken)) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Check if role is correct
  if (currentRole !== 'host') {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Token is valid and role is correct - allow access
  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
};

export default HostProtectedRoute;

