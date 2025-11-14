# Problematic Routes Causing Login Conflict

## Routes That Cause the Issue

### 🚨 **CRITICAL: Ambiguous API Endpoints**

These endpoints are used by **both admin and host** but don't clearly indicate the role in the URL:

#### 1. **Property Management Routes** (Most Critical)
- `/properties` - Used by both admin and host
  - Admin: Create, update, delete properties
  - Host: Update their own property
  - **Problem**: URL doesn't indicate role → Falls back to priority → Uses admin token

- `/properties/list` - Used by both admin and host
- `/properties/search` - Used by both admin and host
- `/propertiesDetials` - Used by both admin and host
- `/properties_utils` - Used by both admin and host (form data)
- `/propertiesbyhost` - ✅ **Recognized as host-specific** (works correctly)

#### 2. **Configuration Routes** (High Impact)
- `/amenities` - Used by both admin and host
  - Admin: CRUD operations
  - Host: Create amenities (POST only)
  - **Problem**: URL doesn't indicate role → Falls back to priority → Uses admin token

- `/facilities` - Used by both admin and host
- `/safety-hygiene` - Used by both admin and host
- `/room-types` - Used by both admin and host
- `/property-types` - Used by both admin and host
- `/cancellation-policies` - Used by both admin and host

#### 3. **Inventory & Rate Management Routes** (Medium Impact)
- `/meal-plan` - Potentially used by both admin and host
  - **Problem**: Not recognized in `getRoleFromUrl()` → Falls back to priority → Uses admin token

- `/roomtype-mealplan` - ✅ **Recognized as host-specific** (works correctly)
- `/special-rates` - Potentially ambiguous
- `/special-rate-applications` - Potentially ambiguous

#### 4. **Booking Routes** (Medium Impact)
- `/bookings` - Used by both admin and host
  - Admin: View all bookings
  - Host: View their property bookings
  - **Problem**: URL doesn't indicate role → Falls back to priority → Uses admin token

#### 5. **Front Desk Routes** (Medium Impact)
- `/properties/:propertyId/front-desk/*` - Used by both admin and host
  - **Problem**: URL pattern not recognized in `getRoleFromUrl()` → Falls back to priority → Uses admin token

## How the Issue Occurs

### Scenario 1: Host Makes API Call with Ambiguous Endpoint

1. **Host is on `/host/base/dashboard`**
2. **Host makes API call to `/properties`** (update their property)
3. **`getRoleFromUrl('/properties')`**:
   - Checks URL patterns → Doesn't match any specific role pattern
   - Returns `null` ❌
4. **Falls back to browser context**:
   - `getRoleFromBrowserContext()` checks `window.location.pathname`
   - **Problem**: During navigation or component mount, `window.location.pathname` might still be `/admin/base/dashboard` (old route)
   - Returns `'admin'` ❌ (wrong!)
5. **Gets admin token**:
   - `getTokenForRole('admin')` returns admin token ❌
   - **Result**: Host API call uses admin token → Backend returns 401 → Host appears logged out

### Scenario 2: Ambiguous Endpoint with Unclear Browser Context

1. **Host is on `/host/base/dashboard`**
2. **Host makes API call to `/amenities`** (create amenity)
3. **`getRoleFromUrl('/amenities')`**:
   - Doesn't match any pattern → Returns `null` ❌
4. **Falls back to browser context**:
   - `getRoleFromBrowserContext()` might fail (timing issue) → Returns `null` ❌
5. **Falls back to priority**:
   - `getTokenByPriority()` checks tokens → Admin token exists ✅
   - Returns admin token ❌ (wrong!)
6. **Result**: Host API call uses admin token → Backend returns 401 → Host appears logged out

## Routes That Work Correctly

### ✅ **Host-Specific Routes** (Recognized in `getRoleFromUrl()`)
- `/host-login` - ✅ Recognized
- `/host/logout` - ✅ Recognized
- `/host/me` - ✅ Recognized
- `/host/refresh` - ✅ Recognized
- `/host-property` - ✅ Recognized
- `/host-properties` - ✅ Recognized
- `/propertiesbyhost` - ✅ Recognized
- `/host/daily-rates` - ✅ Recognized
- `/roomtype-mealplan` - ✅ Recognized

### ✅ **Admin-Specific Routes** (Recognized in `getRoleFromUrl()`)
- `/login` - ✅ Recognized
- `/auth/*` - ✅ Recognized
- `/admin/*` - ✅ Recognized

### ✅ **Agent-Specific Routes** (Recognized in `getRoleFromUrl()`)
- `/api/travel-agent/*` - ✅ Recognized
- `/api/travel-agents/*` - ✅ Recognized
- `/api/properties-for-agent/*` - ✅ Recognized
- `/api/agent-discounts/*` - ✅ Recognized

### ✅ **User-Specific Routes** (Recognized in `getRoleFromUrl()`)
- `/api/users/*` - ✅ Recognized

## Root Cause Summary

### Problem 1: Ambiguous Endpoints
**Routes**: `/properties`, `/amenities`, `/facilities`, `/safety-hygiene`, `/room-types`, `/property-types`, `/cancellation-policies`, `/properties_utils`, `/meal-plan`, `/bookings`, `/properties/:propertyId/front-desk/*`

**Issue**: These endpoints are used by both admin and host, but the URL doesn't clearly indicate which role is making the request.

**Impact**: When host makes API calls to these endpoints:
- URL detection fails → Falls back to browser context
- Browser context might be wrong (timing issue) → Falls back to priority
- Priority uses admin token first → Wrong token selected → 401 error

### Problem 2: Browser Context Timing
**Issue**: `window.location.pathname` might not be updated immediately during navigation.

**Impact**: Browser context detection might return the wrong role (e.g., `'admin'` when on `/host/base/dashboard`).

### Problem 3: Priority Fallback
**Issue**: Priority fallback always uses admin token first (admin > host > agent > user).

**Impact**: When both URL and browser context detection fail, priority fallback uses admin token, even when on host routes.

## Solution

### Option 1: Add Role Prefix to Ambiguous Endpoints (Backend Change)
- Change `/properties` → `/admin/properties` and `/host/properties`
- Change `/amenities` → `/admin/amenities` and `/host/amenities`
- etc.

### Option 2: Improve URL Pattern Detection (Frontend Change)
- Add more patterns to `getRoleFromUrl()` to recognize ambiguous endpoints
- Check request context (e.g., headers, query params) to determine role

### Option 3: Fix Browser Context Detection (Frontend Change)
- Use React Router's `useLocation()` instead of `window.location.pathname`
- This ensures accurate route detection even during navigation

### Option 4: Fix Priority Fallback (Frontend Change)
- Check browser context **first** in priority fallback
- Only fall back to admin > host > agent > user if browser context is unclear

## Recommended Solution

**Combine Option 3 + Option 4**:
1. Use React Router's `useLocation()` for browser context detection (fixes timing issue)
2. Check browser context **first** in priority fallback (prevents wrong token selection)
3. Add 401 error handling (provides better user experience)

This solution:
- ✅ Fixes timing issues with browser context detection
- ✅ Prevents wrong token selection in priority fallback
- ✅ Handles authentication errors gracefully
- ✅ Requires **NO backend changes**
- ✅ Requires **NO API endpoint changes**

## Testing

### Test Case 1: Host Updates Property
1. Login as host → Navigate to `/host/base/host-properties`
2. Update property (calls `/properties` endpoint)
3. **Expected**: Host token is used
4. **Actual**: ❌ Admin token might be used (if browser context detection fails)

### Test Case 2: Host Creates Amenity
1. Login as host → Navigate to `/host/base/host-amenities`
2. Create amenity (calls `/amenities` endpoint)
3. **Expected**: Host token is used
4. **Actual**: ❌ Admin token might be used (if URL detection fails and browser context is wrong)

### Test Case 3: Host Views Bookings
1. Login as host → Navigate to `/host/base/host-all_bookings`
2. View bookings (calls `/bookings` endpoint)
3. **Expected**: Host token is used
4. **Actual**: ❌ Admin token might be used (if URL detection fails and browser context is wrong)

## Files to Check

1. **`zomes_stay/src/services/api/apiEndpoints.js`**:
   - Lines 36-71: PROPERTY endpoints (ambiguous)
   - Lines 40-47: Configuration endpoints (ambiguous)
   - Line 108: MEAL_PLAN endpoint (ambiguous)
   - Lines 119-123: BOOKING endpoints (ambiguous)

2. **`zomes_stay/src/services/api/axiosConfig.js`**:
   - Lines 68-124: `getRoleFromUrl()` function (needs more patterns)
   - Lines 19-60: `getRoleFromBrowserContext()` function (uses `window.location.pathname`)
   - Lines 197-233: `getTokenByPriority()` function (prioritizes admin)

## Conclusion

The issue is caused by **ambiguous API endpoints** that don't clearly indicate the role in the URL. When host makes API calls to these endpoints:
1. URL detection fails (endpoint doesn't match any pattern)
2. Browser context detection might fail (timing issue with `window.location.pathname`)
3. Priority fallback uses admin token (always prioritizes admin)
4. Backend returns 401 (wrong token for host endpoint)
5. Host appears logged out

The solution is to:
1. Use React Router's `useLocation()` for browser context detection
2. Check browser context **first** in priority fallback
3. Add 401 error handling

This will fix the issue **without requiring backend changes**.

