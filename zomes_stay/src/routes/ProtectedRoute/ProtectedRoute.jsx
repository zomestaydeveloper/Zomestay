import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute (Generic)
 * - Guards routes based on presence of an access token and optional allowed roles
 * - Can handle both user and agent authentication
 * - Usage:
 *   <ProtectedRoute redirectTo="/login" roles={["user", "agent"]}>
 *     <Component />
 *   </ProtectedRoute>
 *   or with Outlet when used in a Route element wrapper
 * 
 * Note: For specific role protection, use UserProtectedRoute, AgentProtectedRoute, etc.
 */
const ProtectedRoute = ({ roles, redirectTo = '/login', children }) => {
  const location = useLocation();

  // Read token/role from Redux only (single source of truth)
  // Check tokens based on role: userAccessToken or agentAccessToken
  const userAuth = useSelector((state) => state?.userAuth || {});
  const agentAuth = useSelector((state) => state?.agentAuth || {});
  
  // Get current role - check agentAuth first, then userAuth
  const currentRole = agentAuth?.role || userAuth?.role || '';

  // Get the appropriate token based on role
  let accessToken = '';
  if (currentRole === 'user') {
    accessToken = userAuth?.userAccessToken || '';
  } else if (currentRole === 'agent') {
    // For agent routes
    accessToken = agentAuth?.agentAccessToken || '';
  } else {
    // Fallback: check both tokens
    accessToken = userAuth?.userAccessToken || agentAuth?.agentAccessToken || '';
  }

  const isAuthed = Boolean(accessToken);
  const roleAllowed = Array.isArray(roles) && roles.length > 0 ? roles.includes(currentRole) : true;

  if (!isAuthed || !roleAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
};

export default ProtectedRoute;

