# Concrete Scenarios Causing Login Conflict

## Scenario 1: Host Updates Property Basics ⚠️ **MOST COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. Host clicks "Update Basics" button on `HostProperties.jsx`

### API Call
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/basics`
- **Example**: `/properties/abc-123-def/basics`
- **Payload**: `{ ownerHostId, title, description, status, ... }`

### Token Selection Flow
1. `getRoleFromUrl('/properties/abc-123-def/basics')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. `getRoleFromBrowserContext()`:
   - Checks: `window.location.pathname`
   - Expected: `/host/base/host-properties` → Should return `'host'` ✅
   - **BUT** (Timing Issue): Might be `/admin/base/dashboard` (old route) → Returns `'admin'` ❌
   - **OR**: Might be `null` → Returns `null` ❌

3. If browser context returns `'admin'`:
   - `getTokenForRole('admin')` → Returns `"admin_token_123"` ❌
   - Authorization header: `Bearer admin_token_123` ❌

4. If browser context returns `null`:
   - `getTokenByPriority()` → Returns `"admin_token_123"` ❌ (admin token first)
   - Authorization header: `Bearer admin_token_123` ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message (appears logged out)

---

## Scenario 2: Host Loads Property Details Page ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. `HostProperties.jsx` component mounts
4. `fetchPropertyDetails()` is called (line 388)

### API Calls (3 parallel requests)
1. **Get Host Property**:
   - **Method**: `GET`
   - **URL**: `/propertiesbyhost/{hostId}`
   - **Example**: `/propertiesbyhost/host_id_456`
   - **Status**: ✅ **WORKS** (recognized as host-specific)

2. **Get Creation Form Data**:
   - **Method**: `GET`
   - **URL**: `/properties_utils`
   - **Example**: `/properties_utils`
   - **Status**: ❌ **FAILS** (ambiguous endpoint)

3. **Get Cancellation Policies**:
   - **Method**: `GET`
   - **URL**: `/cancellation-policies`
   - **Example**: `/cancellation-policies`
   - **Status**: ❌ **FAILS** (ambiguous endpoint)

### Token Selection Flow (for `/properties_utils`)

1. `getRoleFromUrl('/properties_utils')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. `getRoleFromBrowserContext()`:
   - Checks: `window.location.pathname`
   - Expected: `/host/base/host-properties` → Should return `'host'` ✅
   - **BUT** (Timing Issue): During component mount, pathname might not be updated yet
   - Might be: `/admin/base/dashboard` (old route) → Returns `'admin'` ❌
   - **OR**: Might be `null` → Returns `null` ❌

3. If browser context returns `'admin'`:
   - `getTokenForRole('admin')` → Returns `"admin_token_123"` ❌
   - Authorization header: `Bearer admin_token_123` ❌

4. If browser context returns `null`:
   - `getTokenByPriority()` → Returns `"admin_token_123"` ❌
   - Authorization header: `Bearer admin_token_123` ❌

### Result
- ❌ Wrong token sent for `/properties_utils` and `/cancellation-policies`
- ❌ Backend returns 401 (Unauthorized)
- ❌ Page fails to load properly (appears broken)
- ❌ Host thinks they're logged out

---

## Scenario 3: Host Updates Property Location ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. Host clicks "Update Address" button

### API Call
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/location`
- **Example**: `/properties/abc-123-def/location`
- **Payload**: `{ ownerHostId, location: { address, coordinates } }`

### Token Selection Flow
1. `getRoleFromUrl('/properties/abc-123-def/location')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. `getRoleFromBrowserContext()`:
   - Checks: `window.location.pathname`
   - Expected: `/host/base/host-properties` → Should return `'host'` ✅
   - **BUT** (Timing Issue): Might be wrong → Returns `'admin'` ❌ or `null` ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message

---

## Scenario 4: Host Updates Property Features ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. Host selects amenities, facilities, safety features
4. Host clicks "Update Features" button

### API Call
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/features`
- **Example**: `/properties/abc-123-def/features`
- **Payload**: `{ ownerHostId, amenityIds, facilityIds, safetyIds }`

### Token Selection Flow
1. `getRoleFromUrl('/properties/abc-123-def/features')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context → Might be wrong ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message

---

## Scenario 5: Host Updates Property Gallery ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. Host uploads new images
4. Host clicks "Update Gallery" button

### API Call
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/gallery`
- **Example**: `/properties/abc-123-def/gallery`
- **Payload**: `FormData` with images and metadata

### Token Selection Flow
1. `getRoleFromUrl('/properties/abc-123-def/gallery')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context → Might be wrong ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message

---

## Scenario 6: Host Updates Room Types ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. Host updates room type details
4. Host clicks "Update Room Types" button

### API Call
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/room-types`
- **Example**: `/properties/abc-123-def/room-types`
- **Payload**: `FormData` with room type data and images

### Token Selection Flow
1. `getRoleFromUrl('/properties/abc-123-def/room-types')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context → Might be wrong ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message

---

## Scenario 7: Host Creates Amenity ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-amenities`

### Action
3. Host creates a new amenity

### API Call
- **Method**: `POST`
- **URL**: `/amenities`
- **Example**: `/amenities`
- **Payload**: `FormData` with amenity data

### Token Selection Flow
1. `getRoleFromUrl('/amenities')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context:
   - Expected: `/host/base/host-amenities` → Should return `'host'` ✅
   - **BUT** (Timing Issue): Might be wrong → Returns `'admin'` ❌ or `null` ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message

---

## Scenario 8: Host Views Cancellation Policies ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. `HostProperties.jsx` loads cancellation policies dropdown

### API Call
- **Method**: `GET`
- **URL**: `/cancellation-policies`
- **Example**: `/cancellation-policies`

### Token Selection Flow
1. `getRoleFromUrl('/cancellation-policies')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context → Might be wrong ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Cancellation policies dropdown doesn't load
- ❌ Page appears broken

---

## Scenario 9: Host Gets Creation Form Data ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. `HostProperties.jsx` loads form data (amenities, facilities, etc.)

### API Call
- **Method**: `GET`
- **URL**: `/properties_utils`
- **Example**: `/properties_utils`

### Token Selection Flow
1. `getRoleFromUrl('/properties_utils')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context → Might be wrong ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Form data doesn't load
- ❌ Page appears broken

---

## Scenario 10: Host Updates Cancellation Policy ⚠️ **COMMON**

### Setup
1. Admin logs in → Navigates to `/admin/base/dashboard`
2. Host logs in (same browser) → Navigates to `/host/base/host-properties`

### Action
3. Host selects a cancellation policy
4. Host clicks "Update Policy" button

### API Call
- **Method**: `PATCH`
- **URL**: `/properties/{propertyId}/policy`
- **Example**: `/properties/abc-123-def/policy`
- **Payload**: `{ ownerHostId, cancellationPolicyId }`

### Token Selection Flow
1. `getRoleFromUrl('/properties/abc-123-def/policy')`:
   - Checks URL patterns → ❌ No match
   - Returns: `null` ❌

2. Falls back to browser context → Might be wrong ❌

3. Falls back to priority → Returns admin token ❌

### Result
- ❌ Wrong token sent (admin token instead of host token)
- ❌ Backend returns 401 (Unauthorized)
- ❌ Host sees error message

---

## Summary of Problematic Endpoints

### Ambiguous Endpoints (Used by Both Admin and Host)

1. `/properties` - All property operations (create, update, delete)
2. `/properties/{propertyId}/basics` - Update property basics
3. `/properties/{propertyId}/location` - Update property location
4. `/properties/{propertyId}/features` - Update property features
5. `/properties/{propertyId}/gallery` - Update property gallery
6. `/properties/{propertyId}/room-types` - Update room types
7. `/properties/{propertyId}/policy` - Update cancellation policy
8. `/properties_utils` - Get creation form data
9. `/amenities` - Amenity operations
10. `/facilities` - Facility operations
11. `/safety-hygiene` - Safety feature operations
12. `/room-types` - Room type operations
13. `/property-types` - Property type operations
14. `/cancellation-policies` - Cancellation policy operations
15. `/meal-plan` - Meal plan operations
16. `/bookings` - Booking operations
17. `/properties/{propertyId}/front-desk/*` - Front desk operations

### Working Endpoints (Recognized Correctly)

1. `/propertiesbyhost` - ✅ Recognized as host-specific
2. `/host-login`, `/host/logout`, `/host/me` - ✅ Recognized as host-specific
3. `/roomtype-mealplan` - ✅ Recognized as host-specific
4. `/api/users/*` - ✅ Recognized as user-specific
5. `/api/travel-agent/*` - ✅ Recognized as agent-specific
6. `/admin/*`, `/auth/*` - ✅ Recognized as admin-specific

---

## Root Cause

### Problem 1: Ambiguous Endpoints
- **Issue**: Endpoints like `/properties/{propertyId}/basics` don't clearly indicate the role
- **Impact**: URL detection fails → Falls back to browser context or priority

### Problem 2: Browser Context Timing
- **Issue**: `window.location.pathname` might not be updated immediately during navigation
- **Impact**: Browser context detection returns wrong role or `null`

### Problem 3: Priority Fallback
- **Issue**: Priority fallback always uses admin token first (admin > host > agent > user)
- **Impact**: When browser context fails, wrong token is selected

---

## Solution

### Fix 1: Use React Router's `useLocation()`
- **Change**: Replace `window.location.pathname` with React Router's `useLocation()` hook
- **Impact**: ✅ Always accurate route detection, even during navigation

### Fix 2: Check Browser Context First in Priority Fallback
- **Change**: Check browser context **first** in `getTokenByPriority()`
- **Impact**: ✅ Prevents wrong token selection when browser context is available

### Fix 3: Add 401 Error Handling
- **Change**: Add response interceptor to handle 401 errors
- **Impact**: ✅ Better user experience, clear error messages

---

## Testing

### Test Scenario 1: Host Updates Property Basics
1. Login as admin → Navigate to `/admin/base/dashboard`
2. Login as host → Navigate to `/host/base/host-properties`
3. Update property title → Click "Update Basics"
4. Check Network tab → Verify Authorization header
5. **Expected**: `Bearer host_token_456` ✅
6. **Actual** (when issue occurs): `Bearer admin_token_123` ❌

### Test Scenario 2: Host Loads Property Details
1. Login as admin → Navigate to `/admin/base/dashboard`
2. Login as host → Navigate to `/host/base/host-properties`
3. Check Network tab → Verify API calls
4. **Expected**: All calls use host token ✅
5. **Actual** (when issue occurs): Some calls use admin token ❌

---

## Conclusion

**The issue occurs when**:
1. Both admin and host are logged in simultaneously
2. Host makes API calls to ambiguous endpoints (e.g., `/properties/{id}/basics`)
3. URL detection fails → Falls back to browser context or priority
4. Browser context might be wrong (timing issue) → Falls back to priority
5. Priority uses admin token first → Wrong token selected → 401 error

**The solution is to**:
1. Use React Router's `useLocation()` for browser context detection
2. Check browser context **first** in priority fallback
3. Add 401 error handling

This will fix all the scenarios listed above.

