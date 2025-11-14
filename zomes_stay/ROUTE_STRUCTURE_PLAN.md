# Route Structure Plan - Role-Based Routing

## 🎯 Current Issues

1. **Agent Dashboard is Public** - `/agent/dashboard` is not protected
2. **Shared Routes** - `/app/*` routes are accessible to both users and agents
3. **ProtectedRoute Limitation** - Only checks `state.auth`, not `state.agentAuth`
4. **No Clear Separation** - Agent routes mixed with public routes

---

## 📋 Proposed Route Structure

### **1. Public Routes** (No Authentication Required)
```
/                    → LoginPage (user login)
/admin               → AdminLogin
/host                → HostLogin
/otp                 → OtpVerification
/otp-verified        → OtpVerified
```

### **2. User Routes** (User Authentication Required)
```
/app/*               → Body component (shared with agents)
  /app/home          → HomePage
  /app/properties/:id → PropertyDetails
  /app/user_profile  → UserProfile (user only)
  /app/whishList     → WishList (user only)
  /app/booking-success → BookingSuccess
  /app/booking-failure → BookingFailure
  /app/find_a_property → FindProperty
  /app/contact_us    → ContactUs
  /app/legal_info    → LegalInfo
  /app/how_to_agent  → HowToAgent
  /app/faq           → Faq
  /app/sign_agent    → SignAgent
  /app/sign_up_agent → SignUpAgent
  /app/sign_in_succes → SignInSuccess
  /app/about_us      → AboutUs
```

### **3. Agent Routes** (Agent Authentication Required)
```
/agent/dashboard     → AgentDashboard (PROTECTED)
/agent/bookings      → AgentBookings (future)
/agent/properties    → AgentProperties (future)
/agent/profile       → AgentProfile (future)

/app/*               → Body component (SHARED with users)
  /app/home          → HomePage (agents can browse)
  /app/properties/:id → PropertyDetails (agents can view)
  /app/find_a_property → FindProperty (agents can search)
  /app/contact_us    → ContactUs
  /app/legal_info    → LegalInfo
  /app/about_us      → AboutUs
```

### **4. Admin Routes** (Admin Authentication Required)
```
/admin/base/*        → BaseLayout (PROTECTED)
  /admin/base/dashboard → Dashboard
  /admin/base/properties → Properties
  /admin/base/travel_agents_list → AgentList
  ... (all admin routes)
```

### **5. Host Routes** (Host Authentication Required)
```
/host/base/*         → BaseLayout (PROTECTED)
  /host/base/dashboard → HostDashboard
  /host/base/host-properties → HostProperties
  ... (all host routes)
```

---

## 🔧 Implementation Plan

### **Step 1: Create AgentProtectedRoute Component**

Create a new component that checks `state.agentAuth` instead of `state.auth`:

```javascript
// src/routes/AgentProtectedRoute.jsx
const AgentProtectedRoute = ({ children, redirectTo = '/' }) => {
  const agentAuth = useSelector((state) => state.agentAuth);
  const isAgentAuthed = Boolean(agentAuth?.authToken);
  
  if (!isAgentAuthed) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
```

### **Step 2: Create MultiRoleProtectedRoute Component**

Create a component that allows BOTH users and agents:

```javascript
// src/routes/MultiRoleProtectedRoute.jsx
const MultiRoleProtectedRoute = ({ children, redirectTo = '/' }) => {
  const userAuth = useSelector((state) => state.auth);
  const agentAuth = useSelector((state) => state.agentAuth);
  
  const isUserAuthed = Boolean(userAuth?.authToken);
  const isAgentAuthed = Boolean(agentAuth?.authToken);
  
  // Allow if either user OR agent is logged in
  if (!isUserAuthed && !isAgentAuthed) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
```

### **Step 3: Update App.jsx Route Structure**

```javascript
<Routes>
  {/* ========== PUBLIC ROUTES ========== */}
  <Route path="/" element={<LoginPage />} />
  <Route path="/admin" element={<AdminLogin />} />
  <Route path="/host" element={<HostLogin />} />
  <Route path="/otp" element={<OtpVerification />} />
  <Route path="/otp-verified" element={<OtpVerified />} />
  
  {/* ========== SHARED ROUTES (User + Agent) ========== */}
  <Route 
    path="/app" 
    element={
      <MultiRoleProtectedRoute redirectTo="/">
        <Body />
      </MultiRoleProtectedRoute>  
    }
  >
    {/* Public browsing (both user and agent) */}
    <Route path="home" element={<HomePage />} />
    <Route path="properties/:id" element={<Detials />} />
    <Route path="find_a_property" element={<FindProperty />} />
    <Route path="contact_us" element={<ContactUs />} />
    <Route path="legal_info" element={<LegalInfo />} />
    <Route path="about_us" element={<AboutUs />} />
    <Route path="how_to_agent" element={<HowToAgent />} />
    <Route path="faq" element={<Faq />} />
    <Route path="sign_agent" element={<SignAgent />} />
    <Route path="sign_up_agent" element={<SignUpAgent />} />
    <Route path="sign_in_succes" element={<SignInSuccess />} />
    
    {/* User-only routes (check inside component) */}
    <Route path="user_profile" element={<UserProfile />} />
    <Route path="whishList" element={<WhishList />} />
    <Route path="booking-success" element={<BookingSuccess />} />
    <Route path="booking-failure" element={<BookingFailure />} />
  </Route>
  
  {/* ========== AGENT ROUTES (Protected) ========== */}
  <Route
    path="/agent"
    element={
      <AgentProtectedRoute redirectTo="/">
        <Outlet />
      </AgentProtectedRoute>
    }
  >
    <Route path="dashboard" element={<AgentDashboard />} />
    {/* Future agent routes */}
    {/* <Route path="bookings" element={<AgentBookings />} /> */}
    {/* <Route path="properties" element={<AgentProperties />} /> */}
  </Route>
  
  {/* ========== ADMIN ROUTES (Protected) ========== */}
  <Route
    path="/admin/base"
    element={
      <ProtectedRoute roles={["admin"]} redirectTo="/admin">
        <BaseLayout />
      </ProtectedRoute>
    }
  >
    {/* ... existing admin routes ... */}
  </Route>
  
  {/* ========== HOST ROUTES (Protected) ========== */}
  <Route
    path="/host/base"
    element={
      <ProtectedRoute roles={["host"]} redirectTo="/host">
        <BaseLayout />
      </ProtectedRoute>
    }
  >
    {/* ... existing host routes ... */}
  </Route>
</Routes>
```

### **Step 4: Update ProtectedRoute to Support Agent Role**

Alternatively, enhance existing `ProtectedRoute` to support multiple roles:

```javascript
// src/routes/ProtectedRoute.jsx (Enhanced)
const ProtectedRoute = ({ roles = [], redirectTo = '/', children }) => {
  const userAuth = useSelector((state) => state.auth);
  const agentAuth = useSelector((state) => state.agentAuth);
  
  // Check user/admin/host auth
  const userToken = userAuth?.authToken || userAuth?.token || userAuth?.accessToken;
  const userRole = userAuth?.role || userAuth?.user?.role || userAuth?.admin?.role;
  
  // Check agent auth
  const agentToken = agentAuth?.authToken;
  
  // Determine if authenticated
  let isAuthed = false;
  let currentRole = null;
  
  if (agentToken && roles.includes('agent')) {
    isAuthed = true;
    currentRole = 'agent';
  } else if (userToken) {
    isAuthed = true;
    currentRole = userRole;
  }
  
  // Check role permission
  const roleAllowed = roles.length === 0 || roles.includes(currentRole);
  
  if (!isAuthed || !roleAllowed) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
```

---

## 🎯 Recommended Approach

### **Option A: Separate Components (Recommended)**
- ✅ Clear separation of concerns
- ✅ Easy to understand
- ✅ Flexible for future changes
- ✅ Better for maintenance

**Files to create:**
1. `src/routes/AgentProtectedRoute.jsx`
2. `src/routes/MultiRoleProtectedRoute.jsx`

### **Option B: Enhanced ProtectedRoute**
- ✅ Single component
- ✅ Less code duplication
- ❌ More complex logic
- ❌ Harder to maintain

---

## 📝 Implementation Steps

1. **Create `AgentProtectedRoute.jsx`**
   - Check `state.agentAuth.authToken`
   - Redirect to `/` if not authenticated

2. **Create `MultiRoleProtectedRoute.jsx`**
   - Check both `state.auth` and `state.agentAuth`
   - Allow access if either is authenticated

3. **Update `App.jsx`**
   - Wrap `/agent/dashboard` with `AgentProtectedRoute`
   - Wrap `/app/*` with `MultiRoleProtectedRoute`
   - Keep admin/host routes as is

4. **Update `AgentDashboard.jsx`**
   - Remove manual auth check (handled by route)
   - Keep Redux state reading for display

5. **Test**
   - User login → access `/app/*` ✅
   - Agent login → access `/app/*` ✅ and `/agent/dashboard` ✅
   - Not logged in → redirect to `/` ✅

---

## 🔍 Route Access Matrix

| Route | Public | User | Agent | Admin | Host |
|-------|--------|------|-------|-------|------|
| `/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/app/home` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `/app/user_profile` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/app/properties/:id` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `/agent/dashboard` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/admin/base/*` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/host/base/*` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## ✅ Benefits

1. **Clear Separation** - Each role has its own route structure
2. **Security** - All protected routes are properly guarded
3. **Flexibility** - Easy to add new routes for each role
4. **Maintainability** - Clear code structure
5. **User Experience** - Proper redirects and error handling

---

## 🚀 Next Steps

1. Review this plan
2. Choose Option A or Option B
3. Implement the chosen approach
4. Test all routes
5. Update documentation

