# Admin/Host Login Conflict - Deep Analysis

## Problem Summary

When both admin and host are logged in simultaneously in the same browser:
1. **Scenario 1**: Admin logs in first, then host logs in → Admin gets logged out (redirected to `/admin` login page)
2. **Scenario 2**: Host logs in first, then admin logs in → Host routes show authentication issues (host gets logged out)

## Root Cause Analysis

### 1. **Token Storage Mechanism** ✅ (NOT THE ISSUE)

- **Location**: `zomes_stay/src/store/adminAuthSlice.js` and `zomes_stay/src/store/hostAuthSlice.js`
- **Storage**: Both tokens are stored in separate Redux slices (`adminAuth` and `hostAuth`)
- **Persistence**: Both are persisted to `localStorage` via `redux-persist` with key `'root'`
- **Status**: ✅ **Tokens CAN coexist** - They are stored in separate slices and should not overwrite each other

### 2. **Protected Route Components** ⚠️ (POTENTIAL ISSUE)

#### AdminProtectedRoute (`zomes_stay/src/routes/AdminProtectedRoute.jsx`)
```javascript
const adminAuth = useSelector((state) => state?.adminAuth || {});
const adminAccessToken = adminAuth?.adminAccessToken || '';
const currentRole = adminAuth?.role || '';

const isAuthed = Boolean(adminAccessToken);
const roleAllowed = currentRole === 'admin';

if (!isAuthed || !roleAllowed) {
  return <Navigate to={redirectTo} replace state={{ from: location }} />;
}
```

**Analysis**:
- ✅ Checks only `adminAuth` slice (correct)
- ✅ Should work correctly even if `hostAuth` exists
- ⚠️ **BUT**: If `adminAuth.adminAccessToken` is somehow cleared or `adminAuth.role` is changed, this would redirect

#### HostProtectedRoute (`zomes_stay/src/routes/HostProtectedRoute.jsx`)
```javascript
const hostAuth = useSelector((state) => state?.hostAuth || {});
const hostAccessToken = hostAuth?.hostAccessToken || '';
const currentRole = hostAuth?.role || '';

const isAuthed = Boolean(hostAccessToken);
const roleAllowed = currentRole === 'host';

if (!isAuthed || !roleAllowed) {
  return <Navigate to={redirectTo} replace state={{ from: location }} />;
}
```

**Analysis**:
- ✅ Checks only `hostAuth` slice (correct)
- ✅ Should work correctly even if `adminAuth` exists
- ⚠️ **BUT**: If `hostAuth.hostAccessToken` is somehow cleared or `hostAuth.role` is changed, this would redirect

### 3. **Token Selection Logic** 🚨 (CRITICAL ISSUE)

#### Location: `zomes_stay/src/services/api/axiosConfig.js`

#### Issue #1: Browser Context Detection (Lines 19-60)
```javascript
const getRoleFromBrowserContext = () => {
  const currentPath = window.location.pathname;
  
  // Host routes - /host base and root level dashboards
  if (currentPath.startsWith('/host/base/') || currentPath === '/host' || currentPath.startsWith('/host/')) {
    return 'host';
  }
  
  // Admin routes - /admin base and root login
  if (currentPath.startsWith('/admin/base/') || currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    return 'admin';
  }
  
  // ... other routes
};
```

**Analysis**:
- ✅ Correctly detects role from browser path
- ✅ Should work correctly when on `/admin/base/*` (returns 'admin') or `/host/base/*` (returns 'host')

#### Issue #2: URL-Based Role Detection (Lines 68-124)
```javascript
const getRoleFromUrl = (url) => {
  // Host endpoints (check before admin to avoid conflicts)
  if (normalizedUrl === '/host-login' || 
      normalizedUrl === '/host/logout' ||
      normalizedUrl.startsWith('/host/') ||
      normalizedUrl.startsWith('/host-property') ||
      normalizedUrl.startsWith('/host-properties') ||
      normalizedUrl.includes('/propertiesbyhost') ||
      normalizedUrl.startsWith('/host/daily-rates')) {
    return 'host';
  }

  // Admin endpoints
  if (normalizedUrl === '/login' || 
      normalizedUrl.startsWith('/auth/') ||
      normalizedUrl.startsWith('/admin/')) {
    return 'admin';
  }
  
  // ... other routes
};
```

**Analysis**:
- ⚠️ **PROBLEM**: Many host/admin API endpoints might not match these patterns
- ⚠️ **PROBLEM**: If URL doesn't match, it returns `null`, causing fallback to priority

#### Issue #3: Priority Fallback (Lines 197-233) 🚨 **CRITICAL**
```javascript
const getTokenByPriority = () => {
  const adminToken = getTokenFromRedux('adminAuth', 'adminAccessToken');
  const hostToken = getTokenFromRedux('hostAuth', 'hostAccessToken');
  
  // Priority: admin > host > agent > user
  if (adminToken) {
    return { token: adminToken, role: 'admin' };
  }
  
  if (hostToken) {
    return { token: hostToken, role: 'host' };
  }
  
  // ... other roles
};
```

**Analysis**:
- 🚨 **CRITICAL ISSUE**: Admin token always takes priority over host token
- 🚨 **CRITICAL ISSUE**: This is used as a fallback when URL/browser context is ambiguous
- 🚨 **PROBLEM**: If an API endpoint doesn't clearly indicate the role, it will use admin token even when on host routes

#### Issue #4: Token Selection Flow (Lines 241-296)
```javascript
const getTokenForUrl = (url) => {
  // Step 1: Try to detect role from API URL
  let role = getRoleFromUrl(url);
  
  // Step 2: If URL is ambiguous, use browser context
  if (!role) {
    role = getRoleFromBrowserContext();
  }
  
  // Step 3: If we have a role, get token for that role
  if (role) {
    const token = getTokenForRole(role);
    if (token) {
      return token;  // ✅ Correct token selected
    }
    // If token not found, return null (NO priority fallback)
    return null;
  }
  
  // Step 4: Priority fallback ONLY when no role is detected
  const priorityToken = getTokenByPriority();
  return priorityToken ? priorityToken.token : null;  // ⚠️ Uses admin token if both exist
};
```

**Analysis**:
- ✅ **GOOD**: Browser context detection should work correctly for `/admin/base/*` and `/host/base/*`
- ✅ **GOOD**: If role is detected and token exists, correct token is used
- ⚠️ **PROBLEM**: If role is detected but token is missing, it returns `null` (no Authorization header)
- 🚨 **CRITICAL**: If URL doesn't match and browser context is unclear, it falls back to priority (admin > host)

### 4. **Missing Response Interceptor** 🚨 (CRITICAL ISSUE)

#### Location: `zomes_stay/src/services/api/axiosConfig.js` (Lines 382-385)
```javascript
axiosInstance.interceptors.response.use((response) => {
  return response;
});
```

**Analysis**:
- 🚨 **CRITICAL ISSUE**: No error handling for 401 (Unauthorized) responses
- 🚨 **CRITICAL ISSUE**: If backend returns 401 (e.g., wrong token, expired token), frontend doesn't handle it
- 🚨 **PROBLEM**: This could cause API calls to fail silently, leading to authentication issues

### 5. **Header Component Role Detection** ⚠️ (MINOR ISSUE)

#### Location: `zomes_stay/src/components/Admin/Header.jsx` (Lines 17-20)
```javascript
const isAdmin = Boolean(adminAuth?.adminAccessToken);
const isHost = Boolean(hostAuth?.hostAccessToken);
const role = isAdmin ? "admin" : isHost ? "host" : "";
```

**Analysis**:
- ⚠️ **MINOR ISSUE**: Prioritizes admin over host
- ⚠️ **PROBLEM**: If both tokens exist, it always shows admin role, even when on host routes
- ⚠️ **IMPACT**: Wrong user details displayed in header, but shouldn't cause logout

### 6. **Redux Persist Configuration** ✅ (NOT THE ISSUE)

#### Location: `zomes_stay/src/store/store.js`
```javascript
const persistConfig = {
  key: 'root',
  storage,  // localStorage
};

const rootReducer = combineReducers({
  adminAuth: adminAuthReducer,
  hostAuth: hostAuthReducer,
  // ... other reducers
});

const persistedReducer = persistReducer(persistConfig, rootReducer);
```

**Analysis**:
- ✅ **CORRECT**: All slices are stored under `'root'` key in localStorage
- ✅ **CORRECT**: Each slice is stored independently
- ✅ **NOT THE ISSUE**: Redux persist should handle both tokens correctly

## The Real Problem

### Primary Issue: **Token Selection Fallback Logic**

When both admin and host are logged in:

1. **Scenario 1: Admin logs in first, then host**
   - Admin token: ✅ Stored in `adminAuth.adminAccessToken`
   - Host token: ✅ Stored in `hostAuth.hostAccessToken`
   - Admin is on `/admin/base/dashboard`
   - Host logs in and navigates to `/host/base/dashboard`
   - **Problem**: If any API call from admin route doesn't clearly indicate role in URL, and browser context detection fails, it falls back to priority (admin token) ✅ **This should work correctly**
   - **BUT**: If API endpoint is ambiguous (e.g., `/properties`, `/meal-plan`), and browser context is unclear, it uses admin token priority
   - **IF**: Browser context detection fails (e.g., during navigation, before route is updated), it might use wrong token
   - **RESULT**: Admin routes might use host token (if admin token is missing), or host routes might use admin token (if priority is used)

2. **Scenario 2: Host logs in first, then admin**
   - Host token: ✅ Stored in `hostAuth.hostAccessToken`
   - Admin token: ✅ Stored in `adminAuth.adminAccessToken`
   - Host is on `/host/base/dashboard`
   - Admin logs in and navigates to `/admin/base/dashboard`
   - **Problem**: Priority fallback always uses admin token first
   - **IF**: Any ambiguous API call is made from host route, and URL doesn't match, it falls back to priority
   - **RESULT**: Host routes might use admin token (causing 401 if backend validates role)

### Secondary Issue: **Missing 401 Error Handling**

- **Problem**: No response interceptor to handle 401 errors
- **Impact**: When wrong token is used, API calls fail, but frontend doesn't know why
- **Result**: Authentication appears broken, but no explicit logout happens

### Tertiary Issue: **Browser Context Timing**

- **Problem**: `getRoleFromBrowserContext()` reads `window.location.pathname`
- **Issue**: During navigation, pathname might not be updated immediately
- **Impact**: Wrong role might be detected, causing wrong token to be selected
- **Result**: API calls use wrong token, causing 401 errors

## Detailed Flow Analysis

### Flow 1: Admin Logs In First, Then Host

1. **Admin logs in**:
   - `AdminLogin.jsx` dispatches `setAdminLogin({ adminAccessToken: '...' })`
   - Token stored in `adminAuth.adminAccessToken`
   - Admin navigates to `/admin/base/dashboard`
   - `AdminProtectedRoute` checks `adminAuth.adminAccessToken` ✅ **PASS**
   - Admin dashboard loads ✅

2. **Host logs in** (while admin is still logged in):
   - `HostLogin.jsx` dispatches `setHostLogin({ hostAccessToken: '...' })`
   - Token stored in `hostAuth.hostAccessToken`
   - Host navigates to `/host/base/dashboard`
   - `HostProtectedRoute` checks `hostAuth.hostAccessToken` ✅ **PASS**
   - Host dashboard loads ✅

3. **API call from admin route** (e.g., `/admin/base/dashboard`):
   - Request URL: `/api/admin/properties` (example)
   - `getRoleFromUrl('/api/admin/properties')`:
     - Checks if URL includes `/admin/` ✅ **YES**
     - Returns `'admin'` ✅
   - `getTokenForRole('admin')`:
     - Gets token from `adminAuth.adminAccessToken` ✅
     - Returns admin token ✅
   - Authorization header: `Bearer <admin_token>` ✅
   - **RESULT**: ✅ **CORRECT**

4. **API call from host route** (e.g., `/host/base/dashboard`):
   - Request URL: `/api/host/properties` (example)
   - `getRoleFromUrl('/api/host/properties')`:
     - Checks if URL starts with `/host/` ✅ **YES** (if endpoint matches)
     - Returns `'host'` ✅
   - `getTokenForRole('host')`:
     - Gets token from `hostAuth.hostAccessToken` ✅
     - Returns host token ✅
   - Authorization header: `Bearer <host_token>` ✅
   - **RESULT**: ✅ **CORRECT**

5. **⚠️ PROBLEM: Ambiguous API call from host route**:
   - Request URL: `/api/properties` (ambiguous - doesn't clearly indicate role)
   - `getRoleFromUrl('/api/properties')`:
     - Doesn't match `/host/` pattern ❌
     - Doesn't match `/admin/` pattern ❌
     - Returns `null` ❌
   - Falls back to `getRoleFromBrowserContext()`:
     - Current path: `/host/base/dashboard`
     - Checks if path starts with `/host/base/` ✅ **YES**
     - Returns `'host'` ✅
   - `getTokenForRole('host')`:
     - Gets token from `hostAuth.hostAccessToken` ✅
     - Returns host token ✅
   - Authorization header: `Bearer <host_token>` ✅
   - **RESULT**: ✅ **CORRECT** (browser context saves the day)

6. **🚨 CRITICAL PROBLEM: Browser context timing issue**:
   - Request URL: `/api/properties` (ambiguous)
   - `getRoleFromUrl('/api/properties')`: Returns `null` ❌
   - **During navigation** (e.g., route change, component mount):
     - `window.location.pathname` might still be `/admin/base/dashboard` (old route)
     - `getRoleFromBrowserContext()`:
       - Current path: `/admin/base/dashboard` (OLD)
       - Returns `'admin'` ❌ **WRONG** (should be 'host')
     - `getTokenForRole('admin')`:
       - Returns admin token ❌ **WRONG**
     - Authorization header: `Bearer <admin_token>` ❌
     - Backend validates token and role ❌ **FAILS** (wrong token for host endpoint)
     - Returns 401 ❌
     - **RESULT**: 🚨 **AUTHENTICATION FAILURE**

### Flow 2: Host Logs In First, Then Admin

1. **Host logs in**:
   - Token stored in `hostAuth.hostAccessToken` ✅
   - Host navigates to `/host/base/dashboard` ✅

2. **Admin logs in** (while host is still logged in):
   - Token stored in `adminAuth.adminAccessToken` ✅
   - Admin navigates to `/admin/base/dashboard` ✅

3. **⚠️ PROBLEM: Ambiguous API call**:
   - Request URL: `/api/properties` (ambiguous)
   - `getRoleFromUrl('/api/properties')`: Returns `null` ❌
   - `getRoleFromBrowserContext()`:
     - Current path: `/host/base/dashboard` (if host route)
     - Returns `'host'` ✅
     - **BUT**: If browser context is unclear or timing issue occurs, it might return `null`
   - **Falls back to priority**:
     - `getTokenByPriority()`:
       - Checks `adminToken` first ✅ **FOUND**
       - Returns `{ token: adminToken, role: 'admin' }` ❌ **WRONG**
     - Authorization header: `Bearer <admin_token>` ❌
     - Backend validates token and role ❌ **FAILS** (wrong token for host endpoint)
     - Returns 401 ❌
     - **RESULT**: 🚨 **AUTHENTICATION FAILURE**

## Why Does Admin Get Logged Out?

### Theory 1: Redux State Corruption
- **Hypothesis**: When host logs in, it might somehow clear or overwrite `adminAuth` state
- **Evidence**: ❌ **UNLIKELY** - Redux slices are separate, and `setHostLogin` only updates `hostAuth` slice
- **Status**: ❌ **NOT THE ISSUE**

### Theory 2: Protected Route Re-evaluation
- **Hypothesis**: When host logs in, `AdminProtectedRoute` re-evaluates and finds `adminAuth.adminAccessToken` missing
- **Evidence**: ⚠️ **POSSIBLE** - If `adminAuth` is cleared somehow, `AdminProtectedRoute` would redirect
- **Status**: ⚠️ **NEEDS INVESTIGATION**

### Theory 3: API Failure Cascade
- **Hypothesis**: Wrong token is used → API returns 401 → Frontend doesn't handle it → App appears broken → User thinks they're logged out
- **Evidence**: ✅ **LIKELY** - Missing 401 error handling, wrong token selection
- **Status**: ✅ **MOST LIKELY**

### Theory 4: Browser Context Timing
- **Hypothesis**: During navigation, browser context is unclear → Wrong token selected → 401 errors → Authentication appears broken
- **Evidence**: ✅ **LIKELY** - Browser context timing issues, priority fallback
- **Status**: ✅ **MOST LIKELY**

## Why Does Host Show Authentication Issues?

### Theory 1: Wrong Token Selection
- **Hypothesis**: Admin token is used for host API calls → Backend validates role → Returns 401 → Host appears logged out
- **Evidence**: ✅ **LIKELY** - Priority fallback uses admin token first
- **Status**: ✅ **MOST LIKELY**

### Theory 2: Missing Token
- **Hypothesis**: Host token is not found → No Authorization header → Backend returns 401 → Host appears logged out
- **Evidence**: ⚠️ **POSSIBLE** - If `hostAuth.hostAccessToken` is missing or cleared
- **Status**: ⚠️ **NEEDS INVESTIGATION**

## Summary of Issues

### 🚨 Critical Issues

1. **Priority Fallback Logic** (Lines 197-233 in `axiosConfig.js`)
   - Admin token always takes priority over host token
   - Used as fallback when URL/browser context is ambiguous
   - **Impact**: Host routes might use admin token, causing 401 errors

2. **Missing 401 Error Handling** (Lines 382-385 in `axiosConfig.js`)
   - No response interceptor to handle 401 errors
   - **Impact**: Authentication failures are not handled, causing app to appear broken

3. **Browser Context Timing** (Lines 19-60 in `axiosConfig.js`)
   - `window.location.pathname` might not be updated during navigation
   - **Impact**: Wrong role detected, wrong token selected

### ⚠️ Medium Issues

4. **URL-Based Role Detection** (Lines 68-124 in `axiosConfig.js`)
   - Many API endpoints might not match the patterns
   - **Impact**: Falls back to browser context or priority, causing wrong token selection

5. **Header Component Role Detection** (Lines 17-20 in `Admin/Header.jsx`)
   - Prioritizes admin over host
   - **Impact**: Wrong user details displayed, but doesn't cause logout

### ✅ Non-Issues

6. **Token Storage** ✅
   - Tokens are stored correctly in separate Redux slices
   - **Status**: ✅ **NOT THE ISSUE**

7. **Protected Routes** ✅
   - Check correct slices
   - **Status**: ✅ **NOT THE ISSUE** (unless tokens are cleared)

## Recommended Solutions

### Solution 1: Fix Priority Fallback Logic
- **Change**: Don't use priority fallback when browser context is available
- **Implementation**: Always prefer browser context over priority
- **Impact**: ✅ **HIGH** - Fixes wrong token selection

### Solution 2: Add 401 Error Handling
- **Change**: Add response interceptor to handle 401 errors
- **Implementation**: Clear tokens, redirect to login, show error message
- **Impact**: ✅ **HIGH** - Prevents silent authentication failures

### Solution 3: Improve Browser Context Detection
- **Change**: Use React Router's `useLocation()` instead of `window.location.pathname`
- **Implementation**: Pass current route to token selection logic
- **Impact**: ✅ **MEDIUM** - Fixes timing issues

### Solution 4: Improve URL-Based Role Detection
- **Change**: Add more patterns for host/admin endpoints
- **Implementation**: Update `getRoleFromUrl()` with comprehensive endpoint patterns
- **Impact**: ✅ **MEDIUM** - Reduces fallback usage

### Solution 5: Fix Header Component
- **Change**: Use browser context to determine active role instead of priority
- **Implementation**: Check current route to determine which role to display
- **Impact**: ✅ **LOW** - Fixes wrong user details display

## Next Steps

1. **Investigate Redux State**: Check if `adminAuth` or `hostAuth` is being cleared when the other logs in
2. **Add Logging**: Add comprehensive logging to token selection logic to track which token is used
3. **Test Scenarios**: Test both scenarios (admin first, host first) with browser dev tools open
4. **Monitor Network**: Check network requests to see which token is being sent
5. **Check Backend**: Verify backend role validation logic

## Conclusion

The primary issue is **token selection logic** that prioritizes admin token over host token when URL/browser context is ambiguous. Combined with **missing 401 error handling**, this causes authentication failures that appear as logout or authentication issues.

The solution requires:
1. Fixing priority fallback logic to prefer browser context
2. Adding 401 error handling
3. Improving browser context detection
4. Improving URL-based role detection

This is a **frontend issue** that can be fixed without backend changes.

