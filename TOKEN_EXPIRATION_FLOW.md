# 🔄 Token Expiration Flow - Step by Step Explanation

## 📍 Current Flow in `authUtils.js`

Let's trace what happens when a token expires:

---

## **Step 1: User Clicks "Apply Now" Button** 🖱️

**Location:** `ReservationWidget.jsx` (line 571)

```javascript
onClick={() => {
  // Step 1: Check authentication
  const authStatus = validateAuth(userAuth, agentAuth);
  const isLoggedIn = authStatus.isAuthenticated;
  
  if (!isLoggedIn) {
    // What happens here?
  }
}}
```

---

## **Step 2: `validateAuth()` Function is Called** 🔍

**Location:** `authUtils.js` (line 84)

```javascript
export const validateAuth = (userAuth, agentAuth) => {
  const userToken = userAuth?.userAccessToken;
  const agentToken = agentAuth?.agentAccessToken;
  
  // Check user token
  if (userToken) {
    const expired = isTokenExpired(userToken);  // ← Step 2a
    if (!expired) {
      return { isAuthenticated: true, ... };
    }
    // Token expired but exists
    return {
      isAuthenticated: false,
      user: null,
      needsRefresh: true  // ← Step 2b: Flag set!
    };
  }
  
  // Similar check for agent token...
}
```

**What happens:**
- ✅ Checks if token exists
- ✅ Calls `isTokenExpired()` to check expiration
- ✅ Returns `needsRefresh: true` if expired

---

## **Step 3: `isTokenExpired()` Checks Token** ⏰

**Location:** `authUtils.js` (line 25)

```javascript
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT without verification (client-side only)
    const payload = JSON.parse(atob(token.split('.')[1]));  // ← Step 3a
    const exp = payload.exp;  // ← Step 3b: Get expiration timestamp
    
    if (!exp) return false;
    
    // Check if expired (with 60 second buffer)
    return Date.now() >= (exp * 1000) - 60000;  // ← Step 3c: Compare
  } catch (error) {
    return true; // Assume expired if can't parse
  }
};
```

**What happens:**
1. **Step 3a:** Splits JWT token (format: `header.payload.signature`)
2. **Step 3b:** Decodes payload and extracts `exp` (expiration timestamp)
3. **Step 3c:** Compares current time with expiration time
   - If `Date.now() >= exp * 1000` → Token is expired ❌
   - Returns `true` if expired, `false` if valid

**Example:**
```javascript
// Token payload might look like:
{
  "agentId": "123",
  "email": "john@agency.com",
  "exp": 1735689600,  // Unix timestamp (Jan 1, 2025)
  "iat": 1735603200   // Issued at (Dec 31, 2024)
}

// Current time: Jan 2, 2025 (1735776000)
// 1735776000 >= 1735689600 → TRUE → Token expired! ❌
```

---

## **Step 4: Back to `validateAuth()` - Returns Result** 📤

**Location:** `authUtils.js` (line 99)

```javascript
// Token expired but exists - might need refresh
return {
  isAuthenticated: false,  // ← User is NOT authenticated
  user: null,              // ← No user info
  needsRefresh: true       // ← BUT refresh token might work!
};
```

**What this means:**
- ❌ Access token is expired
- ✅ But refresh token might still be valid (30 days)
- 🔄 We can try to refresh!

---

## **Step 5: Back to ReservationWidget - Handle Result** 🎯

**Location:** `ReservationWidget.jsx` (line 573)

```javascript
if (!isLoggedIn) {
  // Handle expired token case
  if (authStatus.needsRefresh) {  // ← Step 5a: Check needsRefresh flag
    if (onAuthRequired) {
      onAuthRequired({ reason: 'token_expired' });  // ← Step 5b: Callback
    } else {
      alert("Your session has expired. Please login again.");  // ← Step 5c: Fallback
    }
  }
  return; // ← Step 5d: Stop execution
}
```

**Current Problem:** ❌
- Just shows alert or calls callback
- **NO automatic refresh happening!**
- User has to manually login again

---

## **🚀 What SHOULD Happen Next (Missing Step!)** 

### **Step 6: Automatic Token Refresh** (NOT IMPLEMENTED YET)

**What should happen:**

```javascript
if (authStatus.needsRefresh) {
  // Step 6a: Try to refresh token automatically
  try {
    const newToken = await refreshAccessToken();
    
    // Step 6b: Update Redux store with new token
    dispatch(setAgentLogin({ agentAccessToken: newToken }));
    
    // Step 6c: Retry the original action
    onBookNow({ ... });
    
  } catch (error) {
    // Step 6d: Refresh failed - show login modal
    if (onAuthRequired) {
      onAuthRequired({ reason: 'refresh_failed' });
    }
  }
}
```

---

## **📊 Complete Flow Diagram**

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: User Clicks "Apply Now"                        │
│ ReservationWidget.jsx:571                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Call validateAuth()                             │
│ authUtils.js:84                                         │
│ • Check if token exists                                  │
│ • Call isTokenExpired()                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Check Token Expiration                          │
│ authUtils.js:25                                          │
│ • Decode JWT payload                                     │
│ • Extract 'exp' timestamp                               │
│ • Compare with current time                             │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐           ┌──────────────┐
    │ Valid   │           │ Expired      │
    │ Token   │           │ Token        │
    └────┬────┘           └──────┬───────┘
         │                       │
         │                       ▼
         │           ┌──────────────────────┐
         │           │ Return:              │
         │           │ {                    │
         │           │   isAuthenticated:   │
         │           │     false,           │
         │           │   needsRefresh:     │
         │           │     true ← FLAG!    │
         │           │ }                    │
         │           └──────────┬───────────┘
         │                      │
         │                      ▼
         │           ┌──────────────────────┐
         │           │ STEP 4: Back to      │
         │           │ ReservationWidget    │
         │           │ Check needsRefresh   │
         │           └──────────┬───────────┘
         │                      │
         │                      ▼
         │           ┌──────────────────────┐
         │           │ STEP 5: Current      │
         │           │ Behavior:            │
         │           │ • Show alert         │
         │           │ • Call callback      │
         │           │ ❌ NO AUTO REFRESH   │
         │           └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 6: SHOULD HAPPEN (Missing!)                        │
│ • Call refresh token endpoint                           │
│ • Get new access token                                  │
│ • Update Redux store                                    │
│ • Retry original action                                 │
└─────────────────────────────────────────────────────────┘
```

---

## **🔧 How to Fix: Add Refresh Token Handling**

### **Option 1: Add to `authUtils.js`**

```javascript
import travelAgentAuthService from '../services/property/agent/authService';
import userAuthService from '../services/auth/user_authService';

/**
 * Refresh access token automatically
 * @param {Object} userAuth - Redux userAuth state
 * @param {Object} agentAuth - Redux agentAuth state
 * @returns {Promise<string|null>} - New access token or null
 */
export const refreshAccessToken = async (userAuth, agentAuth) => {
  try {
    // Check if user token needs refresh
    if (userAuth?.userAccessToken && isTokenExpired(userAuth.userAccessToken)) {
      // TODO: Implement user refresh token endpoint
      // const response = await userAuthService.refreshToken();
      // return response.data.data.token;
      return null;
    }
    
    // Check if agent token needs refresh
    if (agentAuth?.agentAccessToken && isTokenExpired(agentAuth.agentAccessToken)) {
      const response = await travelAgentAuthService.refreshToken();
      if (response.data?.success && response.data?.data?.token) {
        return response.data.data.token;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};
```

### **Option 2: Update ReservationWidget**

```javascript
import { refreshAccessToken } from '../../utils/authUtils';
import { useDispatch } from 'react-redux';
import { setAgentLogin } from '../../store/agentAuthSlice';

const dispatch = useDispatch();

// In onClick handler:
if (!isLoggedIn) {
  if (authStatus.needsRefresh) {
    // Try automatic refresh
    const newToken = await refreshAccessToken(userAuth, agentAuth);
    
    if (newToken) {
      // Update Redux and retry
      dispatch(setAgentLogin({ 
        ...agentAuth, 
        agentAccessToken: newToken 
      }));
      // Retry original action
      if (onBookNow) {
        onBookNow({ ... });
      }
      return;
    }
    
    // Refresh failed - show login
    if (onAuthRequired) {
      onAuthRequired({ reason: 'token_expired' });
    }
  }
}
```

---

## **🎯 Summary**

**Current Flow:**
1. ✅ Token expiration detected
2. ✅ `needsRefresh: true` flag set
3. ❌ **STOPS HERE** - Just shows alert
4. ❌ User must manually login

**What Should Happen:**
1. ✅ Token expiration detected
2. ✅ `needsRefresh: true` flag set
3. ✅ **Automatically call refresh endpoint**
4. ✅ Get new access token
5. ✅ Update Redux store
6. ✅ Retry original action
7. ✅ User continues seamlessly!

---

## **💡 Next Steps**

1. Add `refreshAccessToken()` function to `authUtils.js`
2. Update `ReservationWidget` to call refresh automatically
3. Add axios interceptor to handle 401 errors globally
4. Update Redux store when token is refreshed

This will create a seamless user experience! 🚀

