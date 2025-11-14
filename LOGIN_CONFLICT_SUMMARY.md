# Admin/Host Login Conflict - Summary (For Delivery)

## Problem Description

When both admin and host are logged in simultaneously in the same browser:
1. **Scenario 1**: Admin logs in first → Host logs in → Admin gets logged out (redirected to `/admin` login page)
2. **Scenario 2**: Host logs in first → Admin logs in → Host routes show authentication issues (host appears logged out)

## Root Cause

### Primary Issue: **Token Selection Logic** 🚨

**Location**: `zomes_stay/src/services/api/axiosConfig.js`

**Problem**:
1. When an API endpoint doesn't clearly indicate the role (e.g., `/api/properties`), the system falls back to a "priority" system
2. The priority system **always uses admin token first**, then host token, then agent, then user
3. This means:
   - When host makes an API call from an ambiguous endpoint, it might use admin token instead of host token
   - Backend receives admin token but validates it for a host endpoint → Returns 401 (Unauthorized)
   - Frontend doesn't handle 401 errors → App appears broken → User thinks they're logged out

**Code Location**: Lines 197-233 in `axiosConfig.js`
```javascript
const getTokenByPriority = () => {
  const adminToken = getTokenFromRedux('adminAuth', 'adminAccessToken');
  const hostToken = getTokenFromRedux('hostAuth', 'hostAccessToken');
  
  // Priority: admin > host > agent > user
  if (adminToken) {
    return { token: adminToken, role: 'admin' };  // 🚨 Always uses admin first!
  }
  
  if (hostToken) {
    return { token: hostToken, role: 'host' };
  }
  // ...
};
```

### Secondary Issue: **Missing 401 Error Handling** 🚨

**Location**: `zomes_stay/src/services/api/axiosConfig.js` (Lines 382-385)

**Problem**:
- No response interceptor to handle 401 (Unauthorized) errors
- When backend returns 401, frontend doesn't know what to do
- App appears broken, but no explicit logout or error message is shown

**Code**:
```javascript
axiosInstance.interceptors.response.use((response) => {
  return response;  // 🚨 No error handling!
});
```

### Tertiary Issue: **Browser Context Timing** ⚠️

**Location**: `zomes_stay/src/services/api/axiosConfig.js` (Lines 19-60)

**Problem**:
- During navigation, `window.location.pathname` might not be updated immediately
- Wrong role might be detected → Wrong token selected → 401 error

## Why This Happens

### Flow Example: Host Logs In First, Then Admin

1. **Host logs in**:
   - Host token stored in `hostAuth.hostAccessToken` ✅
   - Host navigates to `/host/base/dashboard` ✅
   - Host dashboard loads ✅

2. **Admin logs in** (while host is still logged in):
   - Admin token stored in `adminAuth.adminAccessToken` ✅
   - Admin navigates to `/admin/base/dashboard` ✅
   - Admin dashboard loads ✅

3. **Host makes an API call** (e.g., from `/host/base/dashboard`):
   - Request URL: `/api/properties` (ambiguous - doesn't clearly indicate role)
   - System tries to detect role from URL → Fails (returns `null`)
   - System tries to detect role from browser context → Works (returns `'host'`)
   - System gets host token → Uses host token ✅
   - **RESULT**: ✅ Works correctly

4. **⚠️ PROBLEM: Browser context timing issue**:
   - During navigation (e.g., route change, component mount), `window.location.pathname` might still be `/admin/base/dashboard` (old route)
   - System detects role from browser context → Returns `'admin'` ❌ (wrong!)
   - System gets admin token → Uses admin token ❌ (wrong!)
   - Backend validates admin token for host endpoint → Returns 401 ❌
   - Frontend doesn't handle 401 → App appears broken ❌
   - **RESULT**: 🚨 Authentication failure

5. **⚠️ PROBLEM: Ambiguous endpoint with unclear browser context**:
   - Request URL: `/api/properties` (ambiguous)
   - System tries to detect role from URL → Fails (returns `null`)
   - System tries to detect role from browser context → Fails (returns `null`)
   - System falls back to priority → Uses admin token ❌ (wrong!)
   - Backend validates admin token for host endpoint → Returns 401 ❌
   - Frontend doesn't handle 401 → App appears broken ❌
   - **RESULT**: 🚨 Authentication failure

## What's NOT the Problem

### ✅ Token Storage (NOT THE ISSUE)
- Tokens are stored correctly in separate Redux slices (`adminAuth` and `hostAuth`)
- Both tokens can coexist without overwriting each other
- Redux persist correctly stores both tokens in localStorage

### ✅ Protected Routes (NOT THE ISSUE)
- `AdminProtectedRoute` correctly checks only `adminAuth` slice
- `HostProtectedRoute` correctly checks only `hostAuth` slice
- They don't interfere with each other

## Solutions (Not Implemented Yet)

### Solution 1: Fix Priority Fallback Logic
- **Change**: Don't use priority fallback when browser context is available
- **Impact**: ✅ **HIGH** - Fixes wrong token selection
- **Implementation**: Always prefer browser context over priority

### Solution 2: Add 401 Error Handling
- **Change**: Add response interceptor to handle 401 errors
- **Impact**: ✅ **HIGH** - Prevents silent authentication failures
- **Implementation**: Clear tokens, redirect to login, show error message

### Solution 3: Improve Browser Context Detection
- **Change**: Use React Router's `useLocation()` instead of `window.location.pathname`
- **Impact**: ✅ **MEDIUM** - Fixes timing issues
- **Implementation**: Pass current route to token selection logic

### Solution 4: Improve URL-Based Role Detection
- **Change**: Add more patterns for host/admin endpoints
- **Impact**: ✅ **MEDIUM** - Reduces fallback usage
- **Implementation**: Update `getRoleFromUrl()` with comprehensive endpoint patterns

## Quick Fix (For Testing)

### Temporary Workaround:
1. **Logout before switching roles**: Always logout one role before logging in another
2. **Use separate browsers/tabs**: Use different browsers or incognito tabs for admin and host
3. **Clear localStorage**: Clear `localStorage` when switching roles

## Files to Review

1. **`zomes_stay/src/services/api/axiosConfig.js`**:
   - Lines 197-233: Priority fallback logic (CRITICAL)
   - Lines 382-385: Missing 401 error handling (CRITICAL)
   - Lines 19-60: Browser context detection (MEDIUM)
   - Lines 68-124: URL-based role detection (MEDIUM)

2. **`zomes_stay/src/routes/AdminProtectedRoute.jsx`**:
   - Lines 14-34: Protected route logic (NOT THE ISSUE, but good to verify)

3. **`zomes_stay/src/routes/HostProtectedRoute.jsx`**:
   - Lines 14-34: Protected route logic (NOT THE ISSUE, but good to verify)

4. **`zomes_stay/src/components/Admin/Header.jsx`**:
   - Lines 17-20: Role detection (MINOR ISSUE - wrong user details displayed)

## Testing Steps

1. **Test Scenario 1**: Admin logs in first, then host
   - Open browser dev tools (Network tab)
   - Login as admin → Navigate to `/admin/base/dashboard`
   - Login as host → Navigate to `/host/base/dashboard`
   - Monitor API calls from host route → Check which token is used
   - Expected: Host token should be used for host API calls
   - Actual: Admin token might be used (causing 401)

2. **Test Scenario 2**: Host logs in first, then admin
   - Open browser dev tools (Network tab)
   - Login as host → Navigate to `/host/base/dashboard`
   - Login as admin → Navigate to `/admin/base/dashboard`
   - Monitor API calls from host route → Check which token is used
   - Expected: Host token should be used for host API calls
   - Actual: Admin token might be used (causing 401)

3. **Check Redux State**:
   - Open browser dev tools (Redux DevTools or localStorage)
   - Verify both `adminAuth.adminAccessToken` and `hostAuth.hostAccessToken` exist
   - Expected: Both tokens should exist
   - Actual: Both tokens should exist (if not, there's another issue)

## Conclusion

The issue is a **frontend token selection logic problem** that causes wrong tokens to be used for API calls when both admin and host are logged in simultaneously. This is combined with **missing 401 error handling**, which makes the problem appear as logout or authentication issues.

**The fix requires**:
1. Fixing priority fallback logic to prefer browser context
2. Adding 401 error handling
3. Improving browser context detection
4. Improving URL-based role detection

**This is a frontend issue** that can be fixed without backend changes.

---

**Note**: This is a detailed analysis. For implementation, refer to `LOGIN_CONFLICT_ANALYSIS.md` for comprehensive technical details.

