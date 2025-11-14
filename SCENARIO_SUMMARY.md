# Scenario Summary: Host Updates Property Basics

## Exact Scenario

### Setup
1. **Admin logs in** → Navigates to `/admin/base/dashboard`
   - Redux: `adminAuth.adminAccessToken = "admin_token_123"` ✅

2. **Host logs in** (same browser, admin still logged in) → Navigates to `/host/base/host-properties`
   - Redux: `hostAuth.hostAccessToken = "host_token_456"` ✅
   - Both tokens exist simultaneously ✅

### Action
3. **Host clicks "Update Basics" button** on `HostProperties.jsx` (line 1113)

### API Call
- **Service**: `propertyUpdationService.updateBasics()` (line 11-15)
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/basics`
- **Example**: `/properties/abc-123-def/basics`
- **Payload**: `{ ownerHostId: "host_id_456", title: "...", ... }`

### Token Selection Flow

#### Step 1: URL Detection
- **Function**: `getRoleFromUrl('/properties/abc-123-def/basics')` (line 68)
- **Checks**: URL patterns for role indication
- **Result**: ❌ **No match** → Returns `null`

#### Step 2: Browser Context Detection
- **Function**: `getRoleFromBrowserContext()` (line 19)
- **Checks**: `window.location.pathname`
- **Expected**: `/host/base/host-properties` → Should return `'host'` ✅
- **Actual** (Timing Issue): `/admin/base/dashboard` (old route) → Returns `'admin'` ❌
- **OR**: Returns `null` ❌

#### Step 3: Token Selection
- **If browser context returns `'admin'`**:
  - `getTokenForRole('admin')` → Returns `"admin_token_123"` ❌ (wrong!)
- **If browser context returns `null`**:
  - `getTokenByPriority()` → Returns `"admin_token_123"` ❌ (admin token first)

#### Step 4: Request Sent
- **Authorization header**: `Bearer admin_token_123` ❌ (wrong!)
- **Backend validates**: Admin token is valid, but checks permissions
- **Backend returns**: `401 Unauthorized` ❌ (wrong token for host endpoint)

#### Step 5: Error Handling
- **Response interceptor**: No 401 error handling (line 382-385)
- **Component**: Shows error modal (line 574-580)
- **Host sees**: "Update failed" message ❌ (appears logged out)

---

## The Problem

### Problem 1: Ambiguous Endpoint
- **URL**: `/properties/abc-123-def/basics`
- **Issue**: Doesn't match any role-specific pattern
- **Location**: `axiosConfig.js` line 68-124 (`getRoleFromUrl()`)
- **Result**: Returns `null` ❌

### Problem 2: Browser Context Timing Issue
- **Expected**: `window.location.pathname = '/host/base/host-properties'`
- **Actual** (Timing Issue): `window.location.pathname = '/admin/base/dashboard'` (old route)
- **Location**: `axiosConfig.js` line 19-60 (`getRoleFromBrowserContext()`)
- **Result**: Returns `'admin'` ❌ (wrong!) OR `null` ❌

### Problem 3: Priority Fallback
- **Available Tokens**: Admin token ✅, Host token ✅
- **Priority**: admin > host > agent > user
- **Location**: `axiosConfig.js` line 197-233 (`getTokenByPriority()`)
- **Result**: Returns admin token ❌ (wrong!)

---

## Expected vs Actual

### Expected ✅
1. Host is on `/host/base/host-properties`
2. Host clicks "Update Basics"
3. Token selection: Uses host token ✅
4. Request: `Authorization: Bearer host_token_456` ✅
5. Backend: Validates host token ✅
6. Response: `200 OK` ✅
7. Host: Sees success message ✅

### Actual ❌ (When Issue Occurs)
1. Host is on `/host/base/host-properties`
2. Host clicks "Update Basics"
3. Token selection: Uses admin token ❌ (wrong!)
4. Request: `Authorization: Bearer admin_token_123` ❌
5. Backend: Validates admin token, but checks permissions ❌
6. Response: `401 Unauthorized` ❌
7. Host: Sees error message ❌ (appears logged out)

---

## Root Cause

### Cause 1: Ambiguous Endpoint
- **URL**: `/properties/abc-123-def/basics`
- **Issue**: Doesn't match any role-specific pattern
- **Impact**: URL detection fails → Falls back to browser context or priority

### Cause 2: Browser Context Timing Issue
- **Issue**: `window.location.pathname` might not be updated immediately during navigation
- **Impact**: Browser context detection returns wrong role → Wrong token selected

### Cause 3: Priority Fallback
- **Issue**: Priority fallback always uses admin token first (admin > host > agent > user)
- **Impact**: When browser context fails, wrong token is selected

---

## Solution

### Fix 1: Use React Router's `useLocation()`
- **Change**: Replace `window.location.pathname` with React Router's `useLocation()` hook
- **Location**: `axiosConfig.js` line 19-60
- **Impact**: ✅ Always accurate route detection, even during navigation

### Fix 2: Check Browser Context First in Priority Fallback
- **Change**: Check browser context **first** in `getTokenByPriority()`
- **Location**: `axiosConfig.js` line 197-233
- **Impact**: ✅ Prevents wrong token selection when browser context is available

### Fix 3: Add 401 Error Handling
- **Change**: Add response interceptor to handle 401 errors
- **Location**: `axiosConfig.js` line 382-385
- **Impact**: ✅ Better user experience, clear error messages

---

## Files Involved

1. **`zomes_stay/src/pages/Host/HostProperties.jsx`**:
   - Line 586-624: `handleSaveBasics()` function
   - Line 610: Calls `updatePropertyService.updateBasics()`

2. **`zomes_stay/src/services/property/admin/propertyUpdationService.js`**:
   - Line 11-15: `updateBasics()` function
   - Line 13: Constructs URL: `/properties/${propertyId}/basics`

3. **`zomes_stay/src/services/api/axiosConfig.js`**:
   - Line 68-124: `getRoleFromUrl()` function (URL detection)
   - Line 19-60: `getRoleFromBrowserContext()` function (browser context detection)
   - Line 197-233: `getTokenByPriority()` function (priority fallback)
   - Line 241-295: `getTokenForUrl()` function (token selection)
   - Line 298-380: Request interceptor (token injection)
   - Line 382-385: Response interceptor (error handling - missing)

4. **`zomes_stay/src/services/api/apiEndpoints.js`**:
   - Line 37: `PROPERTY.PROPERTY = '/properties'` (ambiguous endpoint)

---

## Test Steps

1. **Login as admin**:
   - Go to `/admin`
   - Login with admin credentials
   - Navigate to `/admin/base/dashboard`
   - Verify: Admin token exists in Redux

2. **Login as host** (same browser):
   - Go to `/host`
   - Login with host credentials
   - Navigate to `/host/base/host-properties`
   - Verify: Host token exists in Redux

3. **Update property basics**:
   - On `/host/base/host-properties` page
   - Change property title
   - Click "Update Basics" button
   - Open browser dev tools (Network tab)
   - Check: Which token is sent in Authorization header

4. **Expected Result**:
   - Authorization header: `Bearer host_token_456` ✅
   - Response: `200 OK` ✅

5. **Actual Result** (when issue occurs):
   - Authorization header: `Bearer admin_token_123` ❌
   - Response: `401 Unauthorized` ❌

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

