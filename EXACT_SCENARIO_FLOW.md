# Exact Scenario Flow: Host Updates Property Basics

## Scenario: Host Updates Property Basics (Most Common Issue)

### Initial State

1. **Admin logs in**:
   - Redux: `adminAuth.adminAccessToken = "admin_token_123"`
   - Current route: `/admin/base/dashboard`
   - Browser: `window.location.pathname = "/admin/base/dashboard"`

2. **Host logs in** (same browser, admin still logged in):
   - Redux: `hostAuth.hostAccessToken = "host_token_456"`
   - Current route: `/host/base/host-properties`
   - Browser: `window.location.pathname = "/host/base/host-properties"`

---

## Step-by-Step Code Flow

### Step 1: Host Clicks "Update Basics" Button

**File**: `zomes_stay/src/pages/Host/HostProperties.jsx`  
**Line**: 1113

```javascript
<button onClick={handleSaveBasics}>Update Basics</button>
```

### Step 2: handleSaveBasics Function is Called

**File**: `zomes_stay/src/pages/Host/HostProperties.jsx`  
**Line**: 586-624

```javascript
const handleSaveBasics = () =>
  runSectionSave(
    "basics",
    async () => {
      // ... validation ...
      const response = await updatePropertyService.updateBasics(property.id, payload);
      // property.id = "abc-123-def"
      // payload = { ownerHostId: "host_id_456", title: "...", ... }
    }
  );
```

### Step 3: updatePropertyService.updateBasics is Called

**File**: `zomes_stay/src/services/property/admin/propertyUpdationService.js`  
**Line**: 11-15

```javascript
updateBasics: (propertyId, payload) =>
  apiService.patch(
    `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/basics`,
    // PROPERTY.PROPERTY = '/properties'
    // propertyId = "abc-123-def"
    // URL = '/properties/abc-123-def/basics'
    payload
  ),
```

### Step 4: apiService.patch → Axios Interceptor

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 298-343

```javascript
axiosInstance.interceptors.request.use((config) => {
  const requestUrl = config.url || '';  // '/properties/abc-123-def/basics'
  const method = config.method?.toUpperCase() || 'UNKNOWN';  // 'PATCH'
  
  // ... existing auth check ...
  
  if (!token) {
    token = getTokenForUrl(requestUrl);  // Calls getTokenForUrl('/properties/abc-123-def/basics')
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;  // Sets token
  }
  
  return config;
});
```

### Step 5: getTokenForUrl Function is Called

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 241-295

```javascript
const getTokenForUrl = (url) => {
  // url = '/properties/abc-123-def/basics'
  console.log('[getTokenForUrl] Getting token for URL:', url);
  
  // Step 1: Try to detect role from API URL
  let role = getRoleFromUrl(url);  // Calls getRoleFromUrl('/properties/abc-123-def/basics')
  let roleSource = role ? 'url' : null;  // role = null, roleSource = null
  
  // Step 2: If URL is ambiguous, use browser context to determine active role
  if (!role) {
    console.log('[getTokenForUrl] URL is ambiguous, checking browser context...');
    role = getRoleFromBrowserContext();  // Calls getRoleFromBrowserContext()
    roleSource = role ? 'browser' : null;  // role = 'admin' (wrong!) OR null, roleSource = 'browser' OR null
    
    if (role) {
      console.log(`[getTokenForUrl] Using role from browser context: ${role}`);
    }
  }
  
  // Step 3: If we have a role, get token for that role
  if (role) {
    const token = getTokenForRole(role);  // Calls getTokenForRole('admin') (wrong!) OR getTokenForRole(null)
    console.log(`[getTokenForUrl] Token retrieved for role ${role}:`, token ? 'YES' : 'NO');
    if (token) {
      return token;  // Returns admin token ❌
    }
    
    // If role was detected from browser context but token not found, return null
    if (roleSource === 'browser') {
      console.warn(`[getTokenForUrl] ⚠️ Role ${role} detected from browser context but token not found. Returning null (NO priority fallback).`);
      return null;
    }
    
    // If role was detected from URL but token not found, also return null
    if (roleSource === 'url') {
      console.warn(`[getTokenForUrl] ⚠️ Role ${role} detected from URL but token not found. Returning null (NO priority fallback).`);
      return null;
    }
  }
  
  // Step 4: Priority fallback ONLY when no role is detected at all
  console.log('[getTokenForUrl] No role detected from URL or browser context, using priority fallback');
  const priorityToken = getTokenByPriority();  // Calls getTokenByPriority()
  const token = priorityToken ? priorityToken.token : null;  // Returns admin token ❌
  console.log('[getTokenForUrl] Priority token found:', token ? 'YES' : 'NO');
  if (token && priorityToken) {
    console.log(`[getTokenForUrl] Using priority token for role: ${priorityToken.role}`);
  }
  return token;  // Returns admin token ❌
};
```

### Step 6: getRoleFromUrl Function is Called

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 68-124

```javascript
const getRoleFromUrl = (url) => {
  // url = '/properties/abc-123-def/basics'
  if (!url) {
    console.log('[getRoleFromUrl] No URL provided');
    return null;
  }

  // Normalize URL
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  // normalizedUrl = '/properties/abc-123-def/basics'
  console.log('[getRoleFromUrl] Checking URL:', normalizedUrl);

  // Agent endpoints (check first - most specific)
  if (normalizedUrl.includes('/api/travel-agent/') || 
      normalizedUrl.includes('/api/travel-agents/') ||
      normalizedUrl.includes('/api/properties-for-agent/') ||
      normalizedUrl.includes('/api/agent-discounts/')) {
    // ❌ No match
    console.log('[getRoleFromUrl] Detected role: agent');
    return 'agent';
  }

  // User endpoints
  if (normalizedUrl.includes('/api/users/')) {
    // ❌ No match
    console.log('[getRoleFromUrl] Detected role: user');
    return 'user';
  }

  // Host endpoints (check before admin to avoid conflicts)
  if (normalizedUrl === '/host-login' || 
      normalizedUrl === '/host/logout' ||
      normalizedUrl.startsWith('/host/') ||
      normalizedUrl.startsWith('/host-property') ||
      normalizedUrl.startsWith('/host-properties') ||
      normalizedUrl.includes('/propertiesbyhost') ||
      normalizedUrl.startsWith('/host/daily-rates')) {
    // ❌ No match ('/properties/abc-123-def/basics' doesn't match any pattern)
    console.log('[getRoleFromUrl] Detected role: host');
    return 'host';
  }

  // Admin endpoints
  if (normalizedUrl === '/login' || 
      normalizedUrl.startsWith('/auth/') ||
      normalizedUrl.startsWith('/admin/')) {
    // ❌ No match
    console.log('[getRoleFromUrl] Detected role: admin');
    return 'admin';
  }

  // Shared routes at root level - check if they're host-specific
  if (normalizedUrl.includes('/roomtype-mealplan')) {
    // ❌ No match
    console.log('[getRoleFromUrl] Detected role: host (roomtype-mealplan)');
    return 'host';
  }

  // For ambiguous routes (like /properties, /meal-plan), return null
  console.log('[getRoleFromUrl] No role detected from URL, will check browser context or use priority fallback');
  return null;  // ❌ Returns null (URL doesn't match any pattern)
};
```

### Step 7: getRoleFromBrowserContext Function is Called

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 19-60

```javascript
const getRoleFromBrowserContext = () => {
  if (typeof window === 'undefined') return null;
  
  const currentPath = window.location.pathname;
  // Expected: '/host/base/host-properties' ✅
  // BUT (Timing Issue): '/admin/base/dashboard' ❌ (old route)
  // OR: null/empty ❌
  console.log('[getRoleFromBrowserContext] Current browser path:', currentPath);
  
  // IMPORTANT: Check more specific routes FIRST (order matters!)
  
  // Agent routes - check /app/agent/* BEFORE /app/* (more specific first)
  if (currentPath.startsWith('/app/agent/')) {
    // ❌ No match
    console.log('[getRoleFromBrowserContext] Detected role from browser: agent (/app/agent/*)');
    return 'agent';
  }
  
  // Agent dashboard route
  if (currentPath.startsWith('/agent/')) {
    // ❌ No match
    console.log('[getRoleFromBrowserContext] Detected role from browser: agent (/agent/*)');
    return 'agent';
  }
  
  // Host routes - /host base and root level dashboards
  if (currentPath.startsWith('/host/base/') || currentPath === '/host' || currentPath.startsWith('/host/')) {
    // ✅ Match! (if pathname is correct)
    // Expected: '/host/base/host-properties'.startsWith('/host/base/') → true ✅
    // BUT (Timing Issue): '/admin/base/dashboard'.startsWith('/host/base/') → false ❌
    console.log('[getRoleFromBrowserContext] Detected role from browser: host (/host/*)');
    return 'host';  // ✅ Correct (if pathname is correct)
  }
  
  // Admin routes - /admin base and root login
  if (currentPath.startsWith('/admin/base/') || currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    // ❌ Match! (if pathname is wrong due to timing issue)
    // Timing Issue: '/admin/base/dashboard'.startsWith('/admin/base/') → true ❌
    console.log('[getRoleFromBrowserContext] Detected role from browser: admin (/admin/*)');
    return 'admin';  // ❌ Wrong! (if pathname is wrong due to timing issue)
  }
  
  // User routes - /app/* (matches App.jsx line 72)
  if (currentPath.startsWith('/app/')) {
    // ❌ No match
    console.log('[getRoleFromBrowserContext] Detected role from browser: user (/app/*)');
    return 'user';
  }
  
  console.log('[getRoleFromBrowserContext] No role detected from browser context');
  return null;  // ❌ Returns null (if pathname is null/empty)
};
```

### Step 8: getTokenForRole Function is Called (if role is detected)

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 165-189

```javascript
const getTokenForRole = (role) => {
  // role = 'admin' (wrong!) OR 'host' (correct) OR null
  let token = null;
  switch (role) {
    case 'user':
      token = getTokenFromRedux('userAuth', 'userAccessToken');
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;
    case 'agent':
      token = getTokenFromRedux('agentAuth', 'agentAccessToken') || localStorage.getItem('travelAgentToken');
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;
    case 'admin':
      token = getTokenFromRedux('adminAuth', 'adminAccessToken');
      // token = "admin_token_123" ❌ (wrong!)
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;  // Returns "admin_token_123" ❌
    case 'host':
      token = getTokenFromRedux('hostAuth', 'hostAccessToken');
      // token = "host_token_456" ✅ (correct)
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;  // Returns "host_token_456" ✅
    default:
      console.log(`[getTokenForRole] Unknown role: ${role}`);
      return null;
  }
};
```

### Step 9: getTokenByPriority Function is Called (if role is not detected)

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 197-233

```javascript
const getTokenByPriority = () => {
  // Check tokens from Redux persisted state in priority order
  const adminToken = getTokenFromRedux('adminAuth', 'adminAccessToken');
  // adminToken = "admin_token_123" ✅ (exists)
  const hostToken = getTokenFromRedux('hostAuth', 'hostAccessToken');
  // hostToken = "host_token_456" ✅ (exists)
  const agentToken = getTokenFromRedux('agentAuth', 'agentAccessToken') || localStorage.getItem('travelAgentToken');
  const userToken = getTokenFromRedux('userAuth', 'userAccessToken');
  
  console.log('[getTokenByPriority] Available tokens:', {
    admin: adminToken ? 'YES' : 'NO',  // 'YES' ✅
    host: hostToken ? 'YES' : 'NO',     // 'YES' ✅
    agent: agentToken ? 'YES' : 'NO',
    user: userToken ? 'YES' : 'NO'
  });
  
  // Priority: admin > host > agent > user
  if (adminToken) {
    console.log('[getTokenByPriority] Using admin token');
    return { token: adminToken, role: 'admin' };  // ❌ Returns admin token (wrong!)
  }
  
  // Never reaches here because admin token exists
  if (hostToken) {
    console.log('[getTokenByPriority] Using host token');
    return { token: hostToken, role: 'host' };
  }
  
  // ...
};
```

### Step 10: Token is Selected and Added to Request

**File**: `zomes_stay/src/services/api/axiosConfig.js`  
**Line**: 345-349

```javascript
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
  // token = "admin_token_123" ❌ (wrong!)
  // Authorization header = "Bearer admin_token_123" ❌
  console.log('[Interceptor] Authorization header SET with token');
  console.log('[Interceptor] Token length:', token.length);
  console.log('[Interceptor] Token preview:', token.substring(0, 20) + '...');
}
```

### Step 11: Request is Sent to Backend

**Request**:
```
Method: PATCH
URL: /properties/abc-123-def/basics
Headers: {
  Authorization: "Bearer admin_token_123"  ❌ (wrong token!)
  Content-Type: "application/json"
}
Body: {
  ownerHostId: "host_id_456",
  title: "Updated Property Title",
  description: "...",
  status: "active",
  ...
}
```

### Step 12: Backend Validates the Token

**Backend**:
1. Receives: Admin token (`admin_token_123`)
2. Validates: Admin token is valid ✅
3. Checks: Token role is `'admin'` ✅
4. Validates: Admin has permission to update properties ✅
5. **BUT**: Payload contains `ownerHostId: "host_id_456"` (host ID)
6. **OR**: Backend middleware checks if admin token is valid for this specific property
7. **OR**: Backend validates token role against endpoint role (admin vs host)
8. **Result**: Backend might return 401 (Unauthorized) ❌ OR 403 (Forbidden) ❌

### Step 13: Frontend Receives Error Response

**Response**:
```
Status: 401 Unauthorized
Body: {
  success: false,
  message: "Unauthorized: Invalid token or insufficient permissions"
}
```

### Step 14: Error is Handled

**File**: `zomes_stay/src/pages/Host/HostProperties.jsx`  
**Line**: 574-580

```javascript
catch (err) {
  console.error(`Failed to update ${key}:`, err);
  const message =
    err?.response?.data?.message ||
    err?.message ||
    "Failed to update section. Please try again.";
  openFeedbackModal("error", "Update failed", message);  // Shows error modal
  return null;
}
```

### Step 15: Host Sees Error Message

**Result**:
- ❌ Error modal appears: "Update failed"
- ❌ Host thinks they're logged out (because API call failed)
- ❌ Host might try to refresh or re-login

---

## The Exact Problem

### Problem 1: URL Doesn't Match Any Pattern

**URL**: `/properties/abc-123-def/basics`  
**Patterns Checked**:
- `/api/travel-agent/*` → ❌ No match
- `/api/users/*` → ❌ No match
- `/host-login`, `/host/*`, `/host-property*`, `/propertiesbyhost`, `/host/daily-rates` → ❌ No match
- `/login`, `/auth/*`, `/admin/*` → ❌ No match
- `/roomtype-mealplan` → ❌ No match

**Result**: `getRoleFromUrl()` returns `null` ❌

### Problem 2: Browser Context Might Be Wrong

**Expected**: `window.location.pathname = '/host/base/host-properties'` ✅  
**Actual** (Timing Issue): `window.location.pathname = '/admin/base/dashboard'` ❌ (old route)

**Result**: `getRoleFromBrowserContext()` returns `'admin'` ❌ (wrong!)

### Problem 3: Priority Fallback Uses Admin Token First

**Available Tokens**:
- Admin token: `"admin_token_123"` ✅ (exists)
- Host token: `"host_token_456"` ✅ (exists)

**Priority**: admin > host > agent > user

**Result**: `getTokenByPriority()` returns admin token ❌ (wrong!)

---

## Expected vs Actual Behavior

### Expected Behavior ✅

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

### Actual Behavior ❌ (When Issue Occurs)

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
7. Response: `401 Unauthorized` ❌
8. Host: Sees error message ❌ (appears logged out)

---

## The Root Cause

### Cause 1: Ambiguous Endpoint
- **URL**: `/properties/abc-123-def/basics`
- **Issue**: Doesn't match any role-specific pattern in `getRoleFromUrl()`
- **Impact**: URL detection fails → Falls back to browser context or priority

### Cause 2: Browser Context Timing Issue
- **Expected**: `window.location.pathname = '/host/base/host-properties'`
- **Actual** (Timing Issue): `window.location.pathname = '/admin/base/dashboard'` (old route)
- **Impact**: Browser context detection returns wrong role → Wrong token selected

### Cause 3: Priority Fallback
- **Available Tokens**: Admin token ✅, Host token ✅
- **Priority**: admin > host > agent > user
- **Impact**: Priority fallback uses admin token first → Wrong token selected

---

## The Solution

### Fix 1: Use React Router's `useLocation()`
- **Current**: `window.location.pathname` (might be stale)
- **Fix**: Use React Router's `useLocation()` hook (always accurate)
- **Impact**: ✅ Always accurate route detection, even during navigation

### Fix 2: Check Browser Context First in Priority Fallback
- **Current**: Priority fallback always uses admin token first
- **Fix**: Check browser context **first** in `getTokenByPriority()`
- **Impact**: ✅ Prevents wrong token selection when browser context is available

### Fix 3: Add 401 Error Handling
- **Current**: No error handling for 401 errors
- **Fix**: Add response interceptor to handle 401 errors
- **Impact**: ✅ Better user experience, clear error messages

---

## Summary

**The exact route causing the issue**: `/properties/{propertyId}/basics`

**The exact problem**:
1. URL doesn't match any role-specific pattern → Returns `null`
2. Browser context might be wrong (timing issue) → Returns `'admin'` (wrong!) OR `null`
3. Priority fallback uses admin token first → Returns admin token (wrong!)

**The exact fix**:
1. Use React Router's `useLocation()` for browser context detection
2. Check browser context **first** in priority fallback
3. Add 401 error handling

This scenario demonstrates the exact flow that causes the login conflict issue when host tries to update property basics.

