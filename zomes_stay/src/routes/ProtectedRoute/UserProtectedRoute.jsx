import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenExpired } from '../../utils/jwt.utils';

/**
 * UserProtectedRoute
 * - Guards user routes based on presence and validity of userAccessToken
 * - Checks token expiration for better security
 * - Usage:
 *   <UserProtectedRoute redirectTo="/login">
 *     <UserComponent />
 *   </UserProtectedRoute>
 *   or with Outlet when used in a Route element wrapper
 */
const UserProtectedRoute = ({ redirectTo = '/login', children }) => {
  const location = useLocation();

  // Read user auth from Redux
  const userAuth = useSelector((state) => state?.userAuth || {});
  
  // Get user token
  const userAccessToken = userAuth?.userAccessToken || '';
  
  // Check if token exists
  if (!userAccessToken) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Check if token is expired
  if (isTokenExpired(userAccessToken)) {
    // Token expired - redirect to login
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Token is valid - allow access
  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
};

export default UserProtectedRoute;

