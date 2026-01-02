# 🔄 How to Use Token Refresh - Practical Example

## 📝 Step-by-Step: What Happens When Token Expires

### **Scenario: Agent's token expired, clicks "Apply Now"**

---

## **Step 1: User Action** 🖱️

```javascript
// User clicks "Apply Now" button
onClick={() => {
  // Check auth status
  const authStatus = validateAuth(userAuth, agentAuth);
  // authStatus = {
  //   isAuthenticated: false,  ← Token expired!
  //   user: null,
  //   needsRefresh: true        ← Can refresh!
  // }
}}
```

---

## **Step 2: Detect Expired Token** ⚠️

```javascript
// In ReservationWidget.jsx
if (!isLoggedIn) {
  if (authStatus.needsRefresh) {
    // Token expired but refresh token might work!
    console.log("Token expired, attempting refresh...");
    
    // NEXT STEP: Call refresh function
  }
}
```

---

## **Step 3: Call `refreshAccessToken()`** 🔄

```javascript
import { refreshAccessToken } from '../../utils/authUtils';
import { useDispatch } from 'react-redux';
import { setAgentLogin } from '../../store/agentAuthSlice';

const dispatch = useDispatch();

// Inside onClick handler:
if (authStatus.needsRefresh) {
  // Step 3a: Call refresh function
  const refreshResult = await refreshAccessToken(userAuth, agentAuth);
  
  // refreshResult = {
  //   success: true/false,
  //   token: "new_access_token" or null,
  //   type: "agent" or "user",
  //   error: null or "error message"
  // }
}
```

**What happens inside `refreshAccessToken()`:**

```javascript
// authUtils.js - refreshAccessToken()
export const refreshAccessToken = async (userAuth, agentAuth) => {
  // Step 3b: Check agent token
  if (agentAuth?.agentAccessToken && isTokenExpired(agentAuth.agentAccessToken)) {
    
    // Step 3c: Call refresh endpoint
    const response = await travelAgentAuthService.refreshToken();
    // POST /api/travel-agent/refresh
    // Cookie: agent_refresh_token=...
    
    // Step 3d: Server validates refresh token
    // ✅ Checks signature
    // ✅ Checks expiration (30 days)
    // ✅ Checks agent status
    // ✅ Generates NEW access token
    
    // Step 3e: Return new token
    return {
      success: true,
      token: response.data.data.token,  // NEW ACCESS TOKEN!
      type: 'agent'
    };
  }
}
```

---

## **Step 4: Update Redux Store** 💾

```javascript
if (refreshResult.success) {
  // Step 4a: Update Redux with new token
  dispatch(setAgentLogin({
    ...agentAuth,
    agentAccessToken: refreshResult.token  // NEW TOKEN!
  }));
  
  // Step 4b: Now user is authenticated!
  // Retry original action
  if (onBookNow) {
    onBookNow({
      checkIn: range.start,
      checkOut: range.end,
      guests,
      rooms,
      nights: calculateNights()
    });
  }
} else {
  // Step 4c: Refresh failed - show login
  if (onAuthRequired) {
    onAuthRequired({ reason: 'refresh_failed' });
  }
}
```

---

## **Step 5: Complete Flow** ✅

```javascript
// Complete implementation in ReservationWidget.jsx
onClick={async () => {
  // Step 1: Validate auth
  const authStatus = validateAuth(userAuth, agentAuth);
  
  if (!authStatus.isAuthenticated) {
    // Step 2: Check if can refresh
    if (authStatus.needsRefresh) {
      try {
        // Step 3: Try refresh
        const refreshResult = await refreshAccessToken(userAuth, agentAuth);
        
        if (refreshResult.success) {
          // Step 4: Update store
          if (refreshResult.type === 'agent') {
            dispatch(setAgentLogin({
              ...agentAuth,
              agentAccessToken: refreshResult.token
            }));
          } else if (refreshResult.type === 'user') {
            dispatch(setUserLogin({
              ...userAuth,
              userAccessToken: refreshResult.token
            }));
          }
          
          // Step 5: Retry original action
          if (onBookNow) {
            onBookNow({
              checkIn: range.start,
              checkOut: range.end,
              guests,
              rooms,
              nights: calculateNights()
            });
          }
          return; // Success!
        }
      } catch (error) {
        console.error('Refresh failed:', error);
      }
    }
    
    // Refresh failed or not possible - show login
    if (onAuthRequired) {
      onAuthRequired({ reason: authStatus.needsRefresh ? 'refresh_failed' : 'not_authenticated' });
    } else {
      alert(authStatus.needsRefresh 
        ? "Your session has expired. Please login again."
        : "Please login to continue with booking"
      );
    }
    return;
  }
  
  // User is authenticated - proceed normally
  if (onBookNow) {
    onBookNow({
      checkIn: range.start,
      checkOut: range.end,
      guests,
      rooms,
      nights: calculateNights()
    });
  }
}}
```

---

## **📊 Visual Flow**

```
┌─────────────────────────────────────────────┐
│ User Clicks "Apply Now"                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ validateAuth()       │
        │ Checks token         │
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────┐         ┌──────────────┐
   │ Valid   │         │ Expired      │
   │ Token   │         │ Token        │
   └────┬────┘         └──────┬───────┘
        │                     │
        │                     ▼
        │            ┌─────────────────┐
        │            │ needsRefresh:  │
        │            │ true            │
        │            └────────┬────────┘
        │                     │
        │                     ▼
        │            ┌─────────────────┐
        │            │ refreshAccessToken│
        │            │ ()               │
        │            └────────┬─────────┘
        │                     │
        │                     ▼
        │            ┌─────────────────┐
        │            │ POST /api/      │
        │            │ travel-agent/   │
        │            │ refresh         │
        │            └────────┬────────┘
        │                     │
        │            ┌────────┴────────┐
        │            │                 │
        │            ▼                 ▼
        │      ┌─────────┐      ┌──────────┐
        │      │ Success │      │ Failed   │
        │      └────┬────┘      └────┬─────┘
        │           │                 │
        │           ▼                 ▼
        │    ┌─────────────┐   ┌──────────────┐
        │    │ Update      │   │ Show Login   │
        │    │ Redux       │   │ Modal        │
        │    └──────┬──────┘   └──────────────┘
        │           │
        │           ▼
        │    ┌─────────────┐
        │    │ Retry       │
        │    │ Original    │
        │    │ Action      │
        │    └─────────────┘
        │
        ▼
┌──────────────────────┐
│ Proceed with Booking  │
└──────────────────────┘
```

---

## **🎯 Key Points**

1. **`validateAuth()`** detects expired tokens
2. **`needsRefresh: true`** means refresh token might work
3. **`refreshAccessToken()`** calls backend refresh endpoint
4. **Backend validates** refresh token from cookie
5. **New access token** is returned
6. **Redux store** is updated
7. **Original action** is retried

This creates a seamless experience! 🚀

