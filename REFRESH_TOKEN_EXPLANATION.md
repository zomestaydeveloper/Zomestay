# 🔐 Refresh Token Flow - Complete Explanation with Examples

## 📋 Overview

The refresh token system allows users to stay logged in without re-entering credentials. Here's how it works:

**Two Types of Tokens:**
1. **Access Token** (Short-lived: 24 hours) - Used for API requests
2. **Refresh Token** (Long-lived: 30 days) - Used to get new access tokens

---

## 🎯 Complete Flow Example

### **Scenario: Agent "John" logs in and uses the system**

---

## **Step 1: Login** 🔑

**Agent sends login request:**

```http
POST /api/travel-agent/login
Content-Type: application/json

{
  "email": "john@travelagency.com",
  "password": "securePassword123"
}
```

**What happens on the server:**

1. ✅ Validates email/password
2. ✅ Checks agent is approved
3. ✅ Generates **Access Token** (expires in 24h)
4. ✅ Generates **Refresh Token** (expires in 30 days)
5. ✅ Sets refresh token as **httpOnly cookie** (secure, can't be accessed by JavaScript)
6. ✅ Returns both tokens in response

**Server Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "agent": {
      "id": "agent-123",
      "email": "john@travelagency.com",
      "firstName": "John",
      "lastName": "Doe",
      "agencyName": "Travel Pro"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // Access Token
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Refresh Token
  }
}
```

**HTTP Headers (Set Cookie):**
```
Set-Cookie: agent_refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
            HttpOnly; 
            Secure; 
            SameSite=Lax; 
            Path=/; 
            Max-Age=2592000
```

**Client-side (Frontend):**
```javascript
// Store access token in Redux/localStorage
dispatch(setAgentLogin({
  id: response.data.agent.id,
  email: response.data.agent.email,
  agentAccessToken: response.data.token,  // Access token
  // Refresh token is automatically stored in cookie by browser
}));
```

---

## **Step 2: Using Access Token** 📡

**Agent makes API request (e.g., get profile):**

```http
GET /api/travel-agent/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Server validates access token:**
- ✅ Checks signature
- ✅ Checks expiration
- ✅ Extracts agentId from token
- ✅ Returns profile data

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent-123",
    "email": "john@travelagency.com",
    "firstName": "John",
    "agencyName": "Travel Pro"
  }
}
```

**This works fine for 24 hours!** ⏰

---

## **Step 3: Access Token Expires** ⚠️

**After 24 hours, agent tries to access profile again:**

```http
GET /api/travel-agent/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (EXPIRED!)
```

**Server Response:**
```json
{
  "success": false,
  "message": "Unauthorized: Token expired"
}
```

**Status Code: 401 Unauthorized**

---

## **Step 4: Refresh Token to the Rescue!** 🔄

**Frontend detects 401 error and automatically calls refresh endpoint:**

```http
POST /api/travel-agent/refresh
Cookie: agent_refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**OR (if cookie not available, send in body):**

```http
POST /api/travel-agent/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**What happens on the server:**

1. ✅ Extracts refresh token from cookie or body
2. ✅ Verifies refresh token signature
3. ✅ Checks refresh token expiration (30 days)
4. ✅ Validates token type is "refresh"
5. ✅ Checks agent still exists and is approved
6. ✅ Generates **NEW access token** (24h)
7. ✅ Generates **NEW refresh token** (30 days) - Token Rotation
8. ✅ Updates cookie with new refresh token
9. ✅ Returns new tokens

**Server Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // NEW Access Token
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // NEW Refresh Token
  }
}
```

**Client-side (Frontend):**
```javascript
// Update access token in Redux/localStorage
dispatch(setAgentLogin({
  agentAccessToken: response.data.token,  // New access token
}));

// Retry the original request with new token
retryOriginalRequest(newAccessToken);
```

---

## **Step 5: Retry Original Request** ✅

**Now agent can access profile again:**

```http
GET /api/travel-agent/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NEW TOKEN!)
```

**Success!** ✅

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LOGIN                              │
│  POST /api/travel-agent/login                               │
│  { email, password }                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Server generates:          │
        │  • Access Token (24h)        │
        │  • Refresh Token (30d)       │
        │  • Sets cookie               │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Client stores:              │
        │  • Access token in Redux     │
        │  • Refresh token in cookie   │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  API Requests (24 hours)     │
        │  GET /api/travel-agent/profile│
        │  Authorization: Bearer <token>│
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Token Expires (24h later)   │
        │  Returns 401 Unauthorized     │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Auto Refresh                │
        │  POST /api/travel-agent/refresh│
        │  Cookie: agent_refresh_token │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Server validates refresh    │
        │  token & generates new:      │
        │  • New Access Token (24h)    │
        │  • New Refresh Token (30d)   │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Retry Original Request      │
        │  With new access token       │
        └──────────────────────────────┘
```

---

## 📝 Real-World Example Timeline

**Day 1, 10:00 AM - Login**
- Access Token expires: Day 2, 10:00 AM (24h)
- Refresh Token expires: Day 31, 10:00 AM (30d)

**Day 1, 2:00 PM - Using App**
- ✅ Access token valid
- ✅ API calls work fine

**Day 2, 10:01 AM - Token Expired**
- ❌ Access token expired
- ✅ Refresh token still valid (29 days left)
- 🔄 Auto-refresh happens
- ✅ New access token issued
- ✅ New refresh token issued (expires Day 32, 10:01 AM)

**Day 32, 10:02 AM - Refresh Token Expired**
- ❌ Access token expired
- ❌ Refresh token expired
- 🔐 User must login again

---

## 🛡️ Security Features

### **1. HttpOnly Cookies**
- Refresh token stored in httpOnly cookie
- JavaScript cannot access it (prevents XSS attacks)

### **2. Token Rotation**
- Every refresh generates a NEW refresh token
- Old refresh token becomes invalid
- Prevents token reuse if stolen

### **3. Secure Flag (Production)**
- Cookie only sent over HTTPS in production
- Prevents man-in-the-middle attacks

### **4. SameSite: Lax**
- Prevents CSRF attacks
- Cookie only sent with same-site requests

### **5. Validation Checks**
- ✅ Token signature verification
- ✅ Token expiration check
- ✅ Agent status check (must be approved)
- ✅ Agent existence check

---

## 💻 Frontend Implementation Example

```javascript
// axios interceptor for auto-refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint
        const response = await axios.post('/api/travel-agent/refresh');
        
        // Update access token
        const newAccessToken = response.data.data.token;
        dispatch(setAgentLogin({ agentAccessToken: newAccessToken }));

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        dispatch(logoutAgent());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🎯 Key Benefits

1. **Better Security** 🔒
   - Short-lived access tokens limit exposure
   - Refresh tokens can be revoked
   - Token rotation prevents reuse

2. **Better UX** 😊
   - Users stay logged in for 30 days
   - No need to re-enter credentials frequently
   - Seamless token refresh

3. **Scalability** 📈
   - Can revoke refresh tokens without affecting all users
   - Can implement token blacklisting
   - Better control over sessions

---

## ❌ Error Scenarios

### **Scenario 1: Refresh Token Expired**
```json
{
  "success": false,
  "message": "Refresh token has expired. Please login again."
}
```
**Action:** User must login again

### **Scenario 2: Invalid Refresh Token**
```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```
**Action:** Clear cookies, redirect to login

### **Scenario 3: Agent Not Approved**
```json
{
  "success": false,
  "message": "Agent not found or not approved"
}
```
**Action:** Clear tokens, show approval pending message

---

## 📊 Token Comparison

| Feature | Access Token | Refresh Token |
|---------|-------------|---------------|
| **Lifespan** | 24 hours | 30 days |
| **Usage** | API requests | Get new access token |
| **Storage** | Redux/LocalStorage | HttpOnly Cookie |
| **Exposed to JS** | ✅ Yes | ❌ No |
| **Rotation** | Every refresh | Every refresh |
| **Revocable** | ✅ Yes | ✅ Yes |

---

This system ensures secure, seamless authentication! 🎉

