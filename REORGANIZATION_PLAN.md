# 🎯 Reorganization Plan: User/Agent → Host/Admin

## 📋 Overview
This plan focuses on better organizing User/Agent frontend and backend, then applying the same structure to Host/Admin.

---

## 🎯 PHASE 1: User/Agent Frontend Organization

### 1.1 Reorganize Services Structure

**Current Issues:**
- Services scattered across multiple folders (`services/api`, `services/auth`, `services/property`)
- Inconsistent naming and organization
- Hard to find related services

**Target Structure:**
```
zomes_stay/src/services/
├── api/                          # Core API configuration
│   ├── apiService.js
│   ├── apiEndpoints.js
│   └── axiosConfig.js
│
├── user/                         # User-specific services
│   ├── auth/
│   │   └── userAuthService.js
│   ├── profile/
│   │   └── userProfileService.js
│   ├── bookings/
│   │   └── userBookingService.js
│   └── index.js
│
├── agent/                        # Agent-specific services
│   ├── auth/
│   │   └── agentAuthService.js
│   ├── profile/
│   │   └── agentProfileService.js
│   ├── bookings/
│   │   └── agentBookingService.js
│   ├── properties/
│   │   └── agentPropertyService.js
│   └── index.js
│
├── shared/                       # Shared services
│   ├── property/
│   │   ├── propertyDetailsService.js
│   │   └── propertySearchService.js
│   ├── payment/
│   │   └── paymentService.js
│   └── media/
│       └── mediaService.js
│
└── index.js                      # Central export
```

**Actions:**
- [ ] Create `services/user/` folder structure
- [ ] Create `services/agent/` folder structure
- [ ] Move user services to `services/user/`
- [ ] Move agent services to `services/agent/`
- [ ] Create shared services folder
- [ ] Update all imports across the codebase

---

### 1.2 Reorganize Pages Structure

**Current Issues:**
- User pages mixed with public pages
- Agent pages scattered
- No clear separation

**Target Structure:**
```
zomes_stay/src/pages/
├── Public/                       # Public pages (no auth)
│   ├── HomePage.jsx
│   ├── PropertyDetails.jsx
│   ├── ContactUs.jsx
│   ├── AboutUs.jsx
│   └── ...
│
├── User/                         # User pages (protected)
│   ├── UserProfile.jsx
│   ├── UserBookings.jsx
│   └── ...
│
├── Agent/                        # Agent pages (protected)
│   ├── AgentDashboard.jsx
│   ├── AgentBookings.jsx
│   └── ...
│
├── Admin/                        # Admin pages (keep as is)
└── Host/                         # Host pages (keep as is)
```

**Actions:**
- [ ] Create `pages/User/` folder
- [ ] Move user-specific pages
- [ ] Create `pages/Public/` folder
- [ ] Move public pages
- [ ] Update route imports

---

### 1.3 Reorganize Components Structure

**Current Issues:**
- Components mixed together
- Hard to find role-specific components

**Target Structure:**
```
zomes_stay/src/components/
├── shared/                       # Shared components (already exists)
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── ...
│
├── user/                         # User-specific components
│   ├── UserProfileForm.jsx
│   └── ...
│
├── agent/                        # Agent-specific components
│   └── ...
│
├── PropertyDetails/              # Keep as is
└── UserAgentAuth/                # Keep as is
```

**Actions:**
- [ ] Create `components/user/` folder
- [ ] Create `components/agent/` folder
- [ ] Move role-specific components
- [ ] Update imports

---

## 🎯 PHASE 2: User/Agent Backend Organization

### 2.1 Create User Authentication Middleware

**Current Issue:**
- No dedicated `authenticateUser` middleware
- Using verbose `extractRole` + `requireAuth` pattern

**Target:**
```javascript
// server/src/middleware/auth.middleware.js
- authenticateTravelAgent (exists)
+ authenticateUser (NEW)
+ authenticateAgent (rename from authenticateTravelAgent)
```

**Actions:**
- [ ] Create `authenticateUser` middleware
- [ ] Rename `authenticateTravelAgent` to `authenticateAgent`
- [ ] Update all route files to use new middleware

---

### 2.2 Reorganize Backend Routes Structure

**Current Issues:**
- Routes scattered
- Inconsistent middleware usage
- Some routes unprotected

**Target Structure:**
```
server/src/routes/
├── userRoutes/
│   ├── auth.routes.js           # Login, logout, OTP
│   ├── profile.routes.js        # Profile CRUD
│   ├── bookings.routes.js       # User bookings
│   ├── payments.routes.js       # User payments
│   └── index.js                 # Export all routes
│
├── agentRoutes/
│   ├── auth.routes.js           # Login, logout, register
│   ├── profile.routes.js        # Profile CRUD
│   ├── bookings.routes.js       # Agent bookings
│   ├── properties.routes.js    # Agent property access
│   └── index.js                 # Export all routes
│
├── adminRoutes/                 # Keep as is
└── hostRoutes/                  # Keep as is
```

**Actions:**
- [ ] Create `userRoutes/profile.routes.js`
- [ ] Create `userRoutes/bookings.routes.js`
- [ ] Create `agentRoutes/profile.routes.js`
- [ ] Create `agentRoutes/bookings.routes.js`
- [ ] Create route index files
- [ ] Apply proper middleware to all routes

---

### 2.3 Reorganize Backend Controllers Structure

**Current Issues:**
- Controllers mixed together
- Some controllers too large

**Target Structure:**
```
server/src/controllers/
├── userController/
│   ├── auth.controller.js       # Login, logout, OTP
│   ├── profile.controller.js    # Profile CRUD
│   ├── bookings.controller.js   # User bookings
│   └── payments.controller.js   # User payments
│
├── agentController/
│   ├── auth.controller.js       # Login, logout, register
│   ├── profile.controller.js    # Profile CRUD
│   ├── bookings.controller.js   # Agent bookings
│   └── properties.controller.js # Agent property access
│
├── adminController/             # Keep as is
└── hostController/              # Keep as is
```

**Actions:**
- [ ] Split large controllers into smaller ones
- [ ] Create `userController/profile.controller.js`
- [ ] Create `userController/bookings.controller.js`
- [ ] Create `agentController/profile.controller.js`
- [ ] Create `agentController/bookings.controller.js`
- [ ] Update route files

---

## 🎯 PHASE 3: User/Agent Security & Middleware

### 3.1 Implement Proper Authentication Middleware

**Actions:**
- [ ] Create `authenticateUser` middleware
- [ ] Verify user exists and is active
- [ ] Check token expiration
- [ ] Add to all protected user routes

- [ ] Rename `authenticateTravelAgent` → `authenticateAgent`
- [ ] Ensure consistent error handling
- [ ] Add to all protected agent routes

---

### 3.2 Apply Middleware to All Routes

**User Routes:**
- [ ] `/users/profile` → `authenticateUser`
- [ ] `/users/bookings` → `authenticateUser`
- [ ] `/users/payments` → `authenticateUser`

**Agent Routes:**
- [ ] `/travel-agent/profile` → `authenticateAgent` ✅ (already done)
- [ ] `/travel-agent/bookings` → `authenticateAgent`
- [ ] `/travel-agent/properties` → `authenticateAgent`

---

### 3.3 Create Route Index Files

**Actions:**
- [ ] Create `userRoutes/index.js` to export all routes
- [ ] Create `agentRoutes/index.js` to export all routes
- [ ] Update `server/index.js` to use route index files

---

## 🎯 PHASE 4: Host/Admin Organization (After User/Agent)

### 4.1 Apply Same Structure to Host/Admin

**Target Structure:**
```
Frontend:
├── services/host/
├── services/admin/
├── pages/Host/
└── pages/Admin/

Backend:
├── hostRoutes/
│   ├── auth.routes.js
│   ├── profile.routes.js
│   ├── properties.routes.js
│   └── index.js
│
└── adminRoutes/
    ├── auth.routes.js
    ├── profile.routes.js
    ├── properties.routes.js
    └── index.js
```

---

## 📊 Implementation Priority

### Priority 1: Critical Security (Do First)
1. ✅ Create `authenticateUser` middleware
2. ✅ Apply middleware to all user routes
3. ✅ Apply middleware to all agent routes
4. ✅ Verify all protected routes are secured

### Priority 2: Backend Organization
1. ✅ Reorganize backend routes
2. ✅ Split large controllers
3. ✅ Create route index files
4. ✅ Update server/index.js

### Priority 3: Frontend Organization
1. ✅ Reorganize services
2. ✅ Reorganize pages
3. ✅ Reorganize components
4. ✅ Update all imports

### Priority 4: Host/Admin (After User/Agent Complete)
1. ✅ Apply same structure to Host
2. ✅ Apply same structure to Admin
3. ✅ Verify consistency

---

## ✅ Success Criteria

- [ ] All user routes have `authenticateUser` middleware
- [ ] All agent routes have `authenticateAgent` middleware
- [ ] Services organized by role
- [ ] Pages organized by role
- [ ] Consistent folder structure
- [ ] All imports updated
- [ ] No broken routes
- [ ] Security verified

---

## 🚀 Ready to Start?

**Next Step:** Begin with Priority 1 - Create authentication middleware for User/Agent

