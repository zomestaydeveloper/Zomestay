import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenExpired } from '../../utils/jwt.utils';

/**
 * AgentProtectedRoute
 * - Guards agent routes based on presence and validity of agentAccessToken
 * - Checks token expiration for better security
 * - Usage:
 *   <AgentProtectedRoute redirectTo="/login">
 *     <AgentComponent />
 *   </AgentProtectedRoute>
 *   or with Outlet when used in a Route element wrapper
 */
const AgentProtectedRoute = ({ redirectTo = '/login', children }) => {
  const location = useLocation();

  // Read agent auth from Redux
  const agentAuth = useSelector((state) => state?.agentAuth || {});
  
  // Get agent token
  const agentAccessToken = agentAuth?.agentAccessToken || '';
  
  // Check if token exists
  if (!agentAccessToken) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Check if token is expired
  if (isTokenExpired(agentAccessToken)) {
    // Token expired - redirect to login
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Token is valid - allow access
  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
};

export default AgentProtectedRoute;

