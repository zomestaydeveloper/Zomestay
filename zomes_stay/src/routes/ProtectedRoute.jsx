import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * - Guards routes based on presence of an access token and optional allowed roles
 * - Access token is expected to be kept in memory/Redux; we also fall back to sessionStorage
 * - Usage:
 *   <ProtectedRoute redirectTo="/admin/login" roles={["admin"]}>
 *     <AdminLayout />
 *   </ProtectedRoute>
 *   or with Outlet when used in a Route element wrapper
 */
const ProtectedRoute = ({ roles, redirectTo = '/admin', children }) => {
  const location = useLocation();
  console.log("roles to test ",roles)

  // Wait for redux-persist to rehydrate (if present) to avoid reading empty state


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
 
  // Debug logs (removed useSelector to avoid unnecessary rerenders)
  // console.log("accessToken",accessToken)
  // console.log("currentRole",currentRole)


  const isAuthed = Boolean(accessToken);
  const roleAllowed = Array.isArray(roles) && roles.length > 0 ? roles.includes(currentRole) : true;

  if (!isAuthed || !roleAllowed) {
    console.log("redirecting to",redirectTo)
    console.log("isAuthed",isAuthed)
    console.log("roleAllowed",roleAllowed)
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Support either children or Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
}

export default ProtectedRoute;


