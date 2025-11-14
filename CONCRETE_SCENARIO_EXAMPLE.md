# Concrete Scenario: Host Property Update Issue

## Scenario Description

**When**: Both admin and host are logged in simultaneously in the same browser  
**What**: Host tries to update property basics from HostProperties.jsx  
**Result**: API call fails with 401 error, host appears logged out

---

## Step-by-Step Flow

### Initial State

1. **Admin logs in first**:
   - Admin token stored: `adminAuth.adminAccessToken = "admin_token_123"`
   - Admin navigates to: `/admin/base/dashboard`
   - Admin is viewing: Admin dashboard

2. **Host logs in second** (while admin is still logged in):
   - Host token stored: `hostAuth.hostAccessToken = "host_token_456"`
   - Host navigates to: `/host/base/host-properties`
   - Host is viewing: HostProperties.jsx page
   - Both tokens exist in Redux: ✅

### The Problem Occurs

3. **Host clicks "Update Basics" button**:
   - Location: `HostProperties.jsx` line 1113
   - Function: `handleSaveBasics()` (line 586)
   - Action: Calls `updatePropertyService.updateBasics(property.id, payload)` (line 610)

4. **Service call**:
   - Location: `propertyUpdationService.js` line 11-15
   - Method: `apiService.patch()`
   - URL: `/properties/${propertyId}/basics`
   - Example: `/properties/abc-123-def/basics`
   - Payload: `{ ownerHostId, title, description, status, ... }`

5. **Axios interceptor processes the request**:
   - Location: `axiosConfig.js` line 298 (request interceptor)
   - Request URL: `/properties/abc-123-def/basics`
   - Method: `PATCH`

6. **Token selection logic** (Line 341-342):
   ```javascript
   if (!token) {
     token = getTokenForUrl(requestUrl); // '/properties/abc-123-def/basics'
   }
   ```

7. **`getTokenForUrl('/properties/abc-123-def/basics')` is called**:
   - Location: `axiosConfig.js` line 241

8. **Step 1: Try to detect role from URL**:
   - Function: `getRoleFromUrl('/properties/abc-123-def/basics')` (line 68)
   - Checks URL patterns:
     - ❌ Not `/api/travel-agent/*` → No match
     - ❌ Not `/api/users/*` → No match
     - ❌ Not `/host-login`, `/host/`, `/host-property*`, `/propertiesbyhost`, `/host/daily-rates` → No match
     - ❌ Not `/login`, `/auth/*`, `/admin/*` → No match
     - ❌ Not `/roomtype-mealplan` → No match
   - Result: Returns `null` ❌
   - Console: `'[getRoleFromUrl] No role detected from URL, will check browser context or use priority fallback'`

9. **Step 2: Fall back to browser context**:
   - Function: `getRoleFromBrowserContext()` (line 19)
   - Checks: `window.location.pathname`
   - **Expected**: `/host/base/host-properties` → Should return `'host'` ✅
   - **BUT** (Timing Issue):
     - During navigation or component mount, `window.location.pathname` might not be updated immediately
     - Might still be: `/admin/base/dashboard` (old route) ❌
     - Or might be: `null` or empty string ❌
   - Result: Returns `'admin'` (wrong!) ❌ OR `null` ❌
   - Console: 
     - If returns `'admin'`: `'[getRoleFromBrowserContext] Detected role from browser: admin (/admin/*)'` ❌
     - If returns `null`: `'[getRoleFromBrowserContext] No role detected from browser context'` ❌

10. **Step 3: Get token for detected role**:
    - If browser context returned `'admin'`:
      - Function: `getTokenForRole('admin')` (line 165)
      - Gets: `adminAuth.adminAccessToken = "admin_token_123"` ❌ (WRONG!)
      - Returns: `"admin_token_123"` ❌
      - Console: `'[getTokenForUrl] Token retrieved for role admin: YES'` ❌
    - If browser context returned `null`:
      - Proceeds to Step 4 (Priority fallback)

11. **Step 4: Priority fallback** (if browser context returned `null`):
    - Function: `getTokenByPriority()` (line 197)
    - Checks tokens in priority order:
      - Admin token: `"admin_token_123"` ✅ (exists)
      - Host token: `"host_token_456"` ✅ (exists)
    - Priority: admin > host > agent > user
    - Result: Returns `{ token: "admin_token_123", role: "admin" }` ❌ (WRONG!)
    - Console: `'[getTokenByPriority] Using admin token'` ❌

12. **Token is selected**:
    - Selected token: `"admin_token_123"` ❌ (admin token, but should be host token)
    - Authorization header: `Bearer admin_token_123` ❌

13. **Request is sent to backend**:
    - URL: `PATCH /properties/abc-123-def/basics`
    - Headers: `Authorization: Bearer admin_token_123` ❌
    - Payload: `{ ownerHostId: "host_id_456", ... }`

14. **Backend validates the token**:
    - Backend receives: Admin token
    - Backend validates: Admin token is valid ✅
    - Backend checks: Token role is `'admin'` ✅
    - Backend checks: Request is for `/properties/:id/basics`
    - Backend validates: Admin has permission to update properties ✅
    - **BUT**: Payload contains `ownerHostId: "host_id_456"` (host ID)
    - **OR**: Backend middleware checks if admin token is valid for this specific property
    - **OR**: Backend checks if admin is updating their own property or host property
    - **Result**: Backend might return 401 (Unauthorized) ❌ OR 403 (Forbidden) ❌
    - **Reason**: Admin token doesn't have permission to update host's property, OR backend validates token role against endpoint role

15. **Frontend receives error response**:
    - Status: `401 Unauthorized` ❌
    - Response interceptor: Line 382-385
    - **Problem**: No error handling for 401 errors
    - Result: Error is returned to component, but no redirect or logout happens
    - **OR**: If browser context was wrong and returned `null`, error might cause app to break

16. **Host sees the error**:
    - Component: `HostProperties.jsx` line 574-580
    - Error handling: `catch (err) { openFeedbackModal("error", "Update failed", message); }`
    - Shows: Error modal with "Update failed" message
    - **BUT**: Host might think they're logged out because API call failed

---

## Exact Code Flow

### 1. Host Clicks "Update Basics" Button

**File**: `zomes_stay/src/pages/Host/HostProperties.jsx`  
**Line**: 1113 (button click)

```javascript
<button onClick={handleSaveBasics}>Update Basics</button>
```

### 2. handleSaveBasics Function

**File**: `zomes_stay/src/pages/Host/HostProperties.jsx`  
**Line**: 586-624

```javascript
const handleSaveBasics = () =>
  runSectionSave(
    "basics",
    async () => {
      // ... validation ...
      const response = await updatePropertyService.updateBasics(property.id, payload);
      // ...
    }
  );
```

### 3. updatePropertyService.updateBasics

**File**: `zomes_stay/src/services/property/admin/propertyUpdationService.js`  
**Line**: 11-15

```javascript
updateBasics: (propertyId, payload) =>
  apiService.patch(
    `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/basics`,  // '/properties/abc-123-def/basics'
    payload
  ),
```

### 4. apiService.patch → axiosConfig Interceptor

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 298-343

```javascript
axiosInstance.interceptors.request.use((config) => {
  const requestUrl = config.url || '';  // '/properties/abc-123-def/basics'
  
  // ... existing auth check ...
  
  if (!token) {
    token = getTokenForUrl(requestUrl);  // Calls getTokenForUrl('/properties/abc-123-def/basics')
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;  // Sets admin token ❌
  }
  
  return config;
});
```

### 5. getTokenForUrl Function

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 241-295

```javascript
const getTokenForUrl = (url) => {
  // url = '/properties/abc-123-def/basics'
  
  // Step 1: Try to detect role from URL
  let role = getRoleFromUrl(url);  // Returns null ❌
  
  // Step 2: If URL is ambiguous, use browser context
  if (!role) {
    role = getRoleFromBrowserContext();  // Returns 'admin' ❌ (wrong!) OR null ❌
  }
  
  // Step 3: If we have a role, get token for that role
  if (role) {
    const token = getTokenForRole(role);  // Returns admin token ❌
    if (token) {
      return token;  // Returns admin token ❌
    }
  }
  
  // Step 4: Priority fallback
  const priorityToken = getTokenByPriority();  // Returns admin token ❌
  return priorityToken ? priorityToken.token : null;  // Returns admin token ❌
};
```

### 6. getRoleFromUrl Function

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 68-124

```javascript
const getRoleFromUrl = (url) => {
  // url = '/properties/abc-123-def/basics'
  const normalizedUrl = '/properties/abc-123-def/basics';
  
  // Check patterns:
  // ❌ Not '/api/travel-agent/*'
  // ❌ Not '/api/users/*'
  // ❌ Not '/host-login', '/host/*', '/host-property*', '/propertiesbyhost', '/host/daily-rates'
  // ❌ Not '/login', '/auth/*', '/admin/*'
  // ❌ Not '/roomtype-mealplan'
  
  // Result: Returns null ❌
  console.log('[getRoleFromUrl] No role detected from URL, will check browser context or use priority fallback');
  return null;
};
```

### 7. getRoleFromBrowserContext Function

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 19-60

```javascript
const getRoleFromBrowserContext = () => {
  const currentPath = window.location.pathname;  // '/host/base/host-properties' (expected) OR '/admin/base/dashboard' (wrong!)
  
  // Check if path starts with '/host/base/' → Should return 'host' ✅
  if (currentPath.startsWith('/host/base/') || currentPath === '/host' || currentPath.startsWith('/host/')) {
    return 'host';  // ✅ Correct
  }
  
  // BUT: If window.location.pathname is not updated yet:
  // currentPath = '/admin/base/dashboard' (old route)
  if (currentPath.startsWith('/admin/base/') || currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    return 'admin';  // ❌ Wrong! (but this is what gets returned if timing issue occurs)
  }
  
  // OR: If pathname is null/empty:
  return null;  // ❌ Falls back to priority
};
```

### 8. getTokenByPriority Function

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 197-233

```javascript
const getTokenByPriority = () => {
  const adminToken = getTokenFromRedux('adminAuth', 'adminAccessToken');  // "admin_token_123" ✅
  const hostToken = getTokenFromRedux('hostAuth', 'hostAccessToken');     // "host_token_456" ✅
  
  // Priority: admin > host > agent > user
  if (adminToken) {
    return { token: adminToken, role: 'admin' };  // ❌ Returns admin token (wrong!)
  }
  
  // Never reaches here because admin token exists
  if (hostToken) {
    return { token: hostToken, role: 'host' };
  }
};
```

---

## The Exact Problem

### Problem 1: URL Pattern Doesn't Match

**URL**: `/properties/abc-123-def/basics`  
**Patterns Checked**:
- `/host-login`, `/host/`, `/host-property*`, `/propertiesbyhost`, `/host/daily-rates` → ❌ No match
- `/login`, `/auth/*`, `/admin/*` → ❌ No match
- `/api/travel-agent/*`, `/api/users/*` → ❌ No match
- `/roomtype-mealplan` → ❌ No match

**Result**: `getRoleFromUrl()` returns `null` ❌

### Problem 2: Browser Context Timing Issue

**Expected**: `window.location.pathname = '/host/base/host-properties'`  
**Actual** (during timing issue): `window.location.pathname = '/admin/base/dashboard'` (old route)

**Result**: `getRoleFromBrowserContext()` returns `'admin'` ❌ (wrong!)

### Problem 3: Priority Fallback Uses Admin Token First

**Available Tokens**:
- Admin token: `"admin_token_123"` ✅ (exists)
- Host token: `"host_token_456"` ✅ (exists)

**Priority**: admin > host > agent > user

**Result**: `getTokenByPriority()` returns admin token ❌ (wrong!)

---

## Expected vs Actual Behavior

### Expected Behavior

1. Host is on `/host/base/host-properties`
2. Host clicks "Update Basics"
3. API call: `PATCH /properties/abc-123-def/basics`
4. Token selection:
   - URL detection: `null` (ambiguous)
   - Browser context: `'host'` ✅ (correct)
   - Token: `"host_token_456"` ✅ (correct)
5. Request: `Authorization: Bearer host_token_456` ✅
6. Backend: Validates host token ✅
7. Response: `200 OK` ✅
8. Host: Sees success message ✅

### Actual Behavior (When Issue Occurs)

1. Host is on `/host/base/host-properties`
2. Host clicks "Update Basics"
3. API call: `PATCH /properties/abc-123-def/basics`
4. Token selection:
   - URL detection: `null` ❌ (ambiguous)
   - Browser context: `'admin'` ❌ (wrong! - timing issue) OR `null` ❌
   - If `'admin'`: Token: `"admin_token_123"` ❌ (wrong!)
   - If `null`: Priority fallback: `"admin_token_123"` ❌ (wrong!)
5. Request: `Authorization: Bearer admin_token_123` ❌
6. Backend: Validates admin token, but checks permissions ❌
7. Response: `401 Unauthorized` ❌ OR `403 Forbidden` ❌
8. Host: Sees error message ❌ (appears logged out)

---

## Solution

### Fix 1: Improve Browser Context Detection

**Current**: Uses `window.location.pathname` (might be stale during navigation)  
**Fix**: Use React Router's `useLocation()` hook (always accurate)

### Fix 2: Check Browser Context First in Priority Fallback

**Current**: Priority fallback always uses admin token first  
**Fix**: Check browser context **first** in priority fallback, then fall back to admin > host > agent > user

### Fix 3: Add 401 Error Handling

**Current**: No error handling for 401 errors  
**Fix**: Add response interceptor to handle 401 errors with appropriate redirects

---

## Test This Scenario

### Steps to Reproduce

1. **Login as admin**:
   - Go to `/admin`
   - Login with admin credentials
   - Navigate to `/admin/base/dashboard`
   - Verify admin token exists in Redux

2. **Login as host** (in same browser):
   - Go to `/host`
   - Login with host credentials
   - Navigate to `/host/base/host-properties`
   - Verify host token exists in Redux

3. **Update property basics**:
   - On `/host/base/host-properties` page
   - Change property title
   - Click "Update Basics" button
   - Open browser dev tools (Network tab)
   - Check which token is sent in Authorization header

4. **Expected Result**:
   - Authorization header: `Bearer host_token_456` ✅
   - Response: `200 OK` ✅

5. **Actual Result** (when issue occurs):
   - Authorization header: `Bearer admin_token_123` ❌
   - Response: `401 Unauthorized` ❌

### How to Verify

1. **Check Network Tab**:
   - Request: `PATCH /properties/abc-123-def/basics`
   - Headers: Check `Authorization` header
   - Expected: `Bearer host_token_456`
   - Actual: `Bearer admin_token_123` (when issue occurs)

2. **Check Console Logs**:
   - Look for: `'[getRoleFromUrl] No role detected from URL'`
   - Look for: `'[getRoleFromBrowserContext] Current browser path: ...'`
   - Look for: `'[getTokenForUrl] Using role from browser context: ...'`
   - Look for: `'[getTokenByPriority] Using admin token'` (when issue occurs)

3. **Check Redux State**:
   - Open Redux DevTools
   - Check: `adminAuth.adminAccessToken` (should exist)
   - Check: `hostAuth.hostAccessToken` (should exist)
   - Both tokens should exist simultaneously

---

## Summary

**The exact route causing the issue**: `/properties/:propertyId/basics` (and other ambiguous endpoints)

**The exact problem**: 
1. URL doesn't match any role pattern → Returns `null`
2. Browser context detection might fail (timing issue) → Returns wrong role or `null`
3. Priority fallback uses admin token first → Returns admin token (wrong!)

**The exact fix**: 
1. Use React Router's `useLocation()` for browser context detection
2. Check browser context **first** in priority fallback
3. Add 401 error handling

This scenario demonstrates the exact flow that causes the login conflict issue.

