# TestSprite Testing - Frontend Files List

## 📋 Overview
This document lists all files that need to be tested using TestSprite for the ZomesStay frontend application.

**Tech Stack:**
- React 18.2.0
- React Router DOM 7.7.1
- Redux Toolkit + Redux Persist
- Razorpay Payment Gateway
- Vite Build Tool

---

## 🎯 Priority Testing Areas

### **Priority 1: Critical User Flows** 🔴
- Authentication (User/Agent/Admin/Host)
- Payment Processing (Razorpay)
- Booking Flow
- Property Search & Details

### **Priority 2: Core Features** 🟡
- User Profile Management
- Booking Management
- Property Management (Admin/Host)

### **Priority 3: Supporting Features** 🟢
- Static Pages
- Modals & Components
- Configuration Pages

---

## 📄 Pages to Test (69 files)

### **Public Pages** (No Authentication Required)
1. ✅ `src/pages/LoginPage.jsx` - User login (OTP-based)
2. ✅ `src/pages/OtpVerification.jsx` - OTP verification
3. ✅ `src/pages/OtpVerified.jsx` - OTP verified confirmation
4. ✅ `src/pages/SignUp.jsx` - User signup
5. ✅ `src/pages/SignAgent.jsx` - Agent signup page
6. ✅ `src/pages/signUpAgent.jsx` - Agent registration
7. ✅ `src/pages/AboutUs.jsx` - About us page
8. ✅ `src/pages/ContactUs.jsx` - Contact us page
9. ✅ `src/pages/Faq.jsx` - FAQ page
10. ✅ `src/pages/LegalInfo.jsx` - Legal information
11. ✅ `src/pages/HowToAgent.jsx` - How to become agent

### **User Pages** (Protected Routes)
12. ✅ `src/pages/UserProfile.jsx` - User profile management
13. ✅ `src/pages/UserBookings.jsx` - User bookings list
14. ✅ `src/pages/DetialsPage.jsx` - Property details & booking
15. ✅ `src/pages/FindProperty.jsx` - Property search
16. ✅ `src/pages/WhishList.jsx` - Wishlist
17. ✅ `src/pages/BookingSuccess.jsx` - Booking success page
18. ✅ `src/pages/BookingFailure.jsx` - Booking failure page

### **Agent Pages**
19. ✅ `src/pages/Agent/AgentDashboard.jsx` - Agent dashboard
20. ✅ `src/pages/Agent/AgentLoginPage.jsx` - Agent login

### **Admin Pages** (24 files)
21. ✅ `src/pages/Admin/AdminLogin.jsx` - Admin login
22. ✅ `src/pages/Admin/BaseLayout.jsx` - Admin layout wrapper
23. ✅ `src/pages/Admin/DashBoard.jsx` - Admin dashboard
24. ✅ `src/pages/Admin/Properties.jsx` - Properties list
25. ✅ `src/pages/Admin/AddProperty.jsx` - Add new property
26. ✅ `src/pages/Admin/EditProperty.jsx` - Edit property
27. ✅ `src/pages/Admin/AllBookings.jsx` - All bookings
28. ✅ `src/pages/Admin/RegisteredUsers.jsx` - Registered users
29. ✅ `src/pages/Admin/Payment.jsx` - Payment transactions
30. ✅ `src/pages/Admin/PromotionsDiscounts.jsx` - Promotions
31. ✅ `src/pages/Admin/Agents.jsx` - Travel agents management
32. ✅ `src/pages/Admin/Agent_list.jsx` - Agent list
33. ✅ `src/pages/Admin/Admin_inventory.jsx` - Inventory management
34. ✅ `src/pages/Admin/AddRatePlan.jsx` - Add rate plan
35. ✅ `src/pages/Admin/CallbackRequests.jsx` - Callback requests
36. ✅ `src/pages/Admin/CancellationRequests.jsx` - Cancellation requests
37. ✅ `src/pages/Admin/Siteconfiguration.jsx` - Site configuration
38. ✅ `src/pages/Admin/FrontDesk/AdminFrontDesk.jsx` - Front desk
39. ✅ `src/pages/Admin/cancellation_policy/cancellation_policy.jsx` - Cancellation policy
40. ✅ `src/pages/Admin/Property_configurations/Amenities.jsx` - Amenities config
41. ✅ `src/pages/Admin/Property_configurations/Facilities.jsx` - Facilities config
42. ✅ `src/pages/Admin/Property_configurations/SafetyFeatures.jsx` - Safety features
43. ✅ `src/pages/Admin/Property_configurations/PropertyTypes.jsx` - Property types
44. ✅ `src/pages/Admin/Property_configurations/RoomTypes.jsx` - Room types

### **Host Pages** (22 files)
45. ✅ `src/pages/Host/HostLogin.jsx` - Host login
46. ✅ `src/pages/Host/BaseLayout.jsx` - Host layout wrapper
47. ✅ `src/pages/Host/HostDashBoard.jsx` - Host dashboard
48. ✅ `src/pages/Host/HostProperties.jsx` - Host properties
49. ✅ `src/pages/Host/EditProperty.jsx` - Edit property
50. ✅ `src/pages/Host/HostAllBookings.jsx` - Host bookings
51. ✅ `src/pages/Host/Host_allbookings.jsx` - All bookings (alt)
52. ✅ `src/pages/Host/HostRegisteredUsers.jsx` - Registered users
53. ✅ `src/pages/Host/HostPayment.jsx` - Payment transactions
54. ✅ `src/pages/Host/HostPromotionsDiscounts.jsx` - Promotions
55. ✅ `src/pages/Host/HostFrontDesk.jsx` - Front desk
56. ✅ `src/pages/Host/host-frontdesk/HostFrontDeskWrapper.jsx` - Front desk wrapper
57. ✅ `src/pages/Host/HostInventoryWrapper.jsx` - Inventory wrapper
58. ✅ `src/pages/Host/HostAddRatePlanWrapper.jsx` - Rate plan wrapper
59. ✅ `src/pages/Host/MealPlan.jsx` - Meal plans
60. ✅ `src/pages/Host/Best_rates.jsx` - Best rates
61. ✅ `src/pages/Host/Property_configurations/HostAmenities.jsx` - Amenities
62. ✅ `src/pages/Host/Property_configurations/HostFacilities.jsx` - Facilities
63. ✅ `src/pages/Host/Property_configurations/HostSafetyFeatures.jsx` - Safety
64. ✅ `src/pages/Host/Property_configurations/HostPropertyTypes.jsx` - Property types
65. ✅ `src/pages/Host/Property_configurations/HostRoomTypes.jsx` - Room types

### **Utility Pages**
66. ✅ `src/pages/ReduxDebug.jsx` - Redux debug tool
67. ✅ `src/pages/SignInSucces.jsx` - Sign in success
68. ✅ `src/pages/Test.jsx` - Test page (remove in production)

---

## 🧩 Components to Test (71+ files)

### **Authentication Components**
1. ✅ `src/components/AgentLoginModal.jsx` - Agent login modal
2. ✅ `src/components/AgentSignupModal.jsx` - Agent signup modal
3. ✅ `src/components/UserSignupModal.jsx` - User signup modal

### **Core UI Components**
4. ✅ `src/components/Header.jsx` - Main header
5. ✅ `src/components/Footer.jsx` - Footer
6. ✅ `src/components/HomePage.jsx` - Homepage component
7. ✅ `src/components/Body.jsx` - Main body wrapper
8. ✅ `src/components/Page.jsx` - Page wrapper
9. ✅ `src/components/Loader.jsx` - Loading spinner
10. ✅ `src/components/NotificationModal.jsx` - Notification modal
11. ✅ `src/components/ErrorDialog.jsx` - Error dialog

### **Property & Booking Components**
12. ✅ `src/components/DetailsPage.jsx` - Property details component
13. ✅ `src/components/RoomSection.jsx` - Room selection (CRITICAL - Razorpay integration)
14. ✅ `src/components/RoomCard.jsx` - Room card display
15. ✅ `src/components/Card.jsx` - Property card
16. ✅ `src/components/CardRow.jsx` - Property card row
17. ✅ `src/components/FeatureCard.jsx` - Feature card
18. ✅ `src/components/FeatureCardRow.jsx` - Feature card row
19. ✅ `src/components/FacilityCard.jsx` - Facility card
20. ✅ `src/components/FacilityCardRow.jsx` - Facility card row
21. ✅ `src/components/AmenitiesList.jsx` - Amenities list
22. ✅ `src/components/SafetyHygieneList.jsx` - Safety features list

### **Booking & Calendar Components**
23. ✅ `src/components/DateRangePicker.jsx` - Date picker
24. ✅ `src/components/Calendar/DoubleMonthCalendar.jsx` - Calendar component
25. ✅ `src/components/ReservationWidget.jsx` - Reservation widget
26. ✅ `src/components/ReservationCalendarPanel.jsx` - Calendar panel
27. ✅ `src/components/GuestSelectorPopup.jsx` - Guest selector

### **Modal Components**
28. ✅ `src/components/CallbackRequestModal.jsx` - Callback request modal
29. ✅ `src/components/RequestCallbackModal.jsx` - Request callback
30. ✅ `src/components/RatePlannerModal.jsx` - Rate planner modal
31. ✅ `src/components/SpecialRateModal.jsx` - Special rate modal
32. ✅ `src/components/AddAmenityModal.jsx` - Add amenity modal
33. ✅ `src/components/AddRoomModal.jsx` - Add room modal
34. ✅ `src/components/MobileSearchModal.jsx` - Mobile search modal

### **Admin Components** (11 files)
35. ✅ `src/components/Admin/Header.jsx` - Admin header
36. ✅ `src/components/Admin/Footer.jsx` - Admin footer
37. ✅ `src/components/Admin/PropertyCard.jsx` - Property card
38. ✅ `src/components/Admin/PropertyCardRow.jsx` - Property card row
39. ✅ `src/components/Admin/StatCard.jsx` - Statistics card
40. ✅ `src/components/Admin/SideCard.jsx` - Side card
41. ✅ `src/components/Admin/SidebarItem.jsx` - Sidebar item
42. ✅ `src/components/Admin/EarningRevenueCard.jsx` - Revenue card
43. ✅ `src/components/Admin/PendingCancellationPopup.jsx` - Cancellation popup
44. ✅ `src/components/Admin/RoomDetials.jsx` - Room details
45. ✅ `src/components/Admin/ScrollToTop.jsx` - Scroll to top

### **Shared Components** (14 files)
46. ✅ `src/components/shared/AddRatePlan/AddRatePlan.jsx` - Add rate plan
47. ✅ `src/components/shared/bookingList/bookingList.jsx` - Booking list
48. ✅ `src/components/shared/CancellationRequestModal.jsx` - Cancellation modal
49. ✅ `src/components/shared/FrontDesk/FrontDeskBoard.jsx` - Front desk board
50. ✅ `src/components/shared/Inventory/Inventory.jsx` - Inventory component
51. ✅ `src/components/shared/MealPlans/MealPlans.jsx` - Meal plans
52. ✅ `src/components/shared/Property/EditPropertyScreen.jsx` - Edit property screen
53. ✅ `src/components/shared/PropertyConfigurations/AmenitiesManager.jsx` - Amenities manager
54. ✅ `src/components/shared/PropertyConfigurations/FacilitiesManager.jsx` - Facilities manager
55. ✅ `src/components/shared/PropertyConfigurations/PropertyTypesManager.jsx` - Property types manager
56. ✅ `src/components/shared/PropertyConfigurations/RoomTypesManager.jsx` - Room types manager
57. ✅ `src/components/shared/PropertyConfigurations/SafetyFeaturesManager.jsx` - Safety features manager
58. ✅ `src/components/shared/RatePlans/RatePlans.jsx` - Rate plans
59. ✅ `src/components/shared/ReviewModal.jsx` - Review modal

### **Other Components**
60. ✅ `src/components/Banner.jsx` - Banner component
61. ✅ `src/components/Dashboard.jsx` - Dashboard component
62. ✅ `src/components/DefaultHeader.jsx` - Default header
63. ✅ `src/components/ScrollComponent.jsx` - Scroll component
64. ✅ `src/components/ScrollTop.jsx` - Scroll to top
65. ✅ `src/components/CallbackRequests/AllCallbackRequests.jsx` - Callback requests list
66. ✅ `src/components/Guests/AllGuests.jsx` - Guests list
67. ✅ `src/components/Payments/AllPayments.jsx` - Payments list

---

## 🔌 Services to Test (54+ files)

### **API Services** (Critical)
1. ✅ `src/services/api/apiService.js` - Base API service
2. ✅ `src/services/api/apiEndpoints.js` - API endpoints configuration
3. ✅ `src/services/api/axiosConfig.js` - Axios configuration
4. ✅ `src/services/api/axiosConfig2.js` - Alternative axios config

### **Authentication Services**
5. ✅ `src/services/auth/user_authService.js` - User authentication
6. ✅ `src/services/auth/agent_authService.js` - Agent authentication
7. ✅ `src/services/auth/host_authService.js` - Host authentication
8. ✅ `src/services/auth/authService.js` - Admin authentication

### **Payment Services** (CRITICAL - Razorpay)
9. ✅ `src/services/paymentService.js` - **Razorpay payment service** ⚠️ HIGH PRIORITY
10. ✅ `src/services/payments/paymentsService.js` - Payment operations
11. ✅ `src/services/payments/index.js` - Payment exports

### **Property Services**
12. ✅ `src/services/property/user/propertyDetials.js` - Property details
13. ✅ `src/services/property/user/bookingData.js` - Booking data
14. ✅ `src/services/property/admin/propertyService.js` - Admin property service
15. ✅ `src/services/property/admin/propertyUpdationService.js` - Property updates
16. ✅ `src/services/property/admin/propertyRoomType.js` - Room types
17. ✅ `src/services/property/admin/booking/bookingService.js` - Booking service
18. ✅ `src/services/property/admin/cancellationPolicy/cancellationPolicy.js` - Cancellation policy
19. ✅ `src/services/property/host/updateProperty.js` - Host property updates
20. ✅ `src/services/property/host/inventoryService.js` - Inventory service
21. ✅ `src/services/property/host/dailyRate.js` - Daily rates
22. ✅ `src/services/property/host/mealPlan.js` - Meal plans
23. ✅ `src/services/property/host/roomtypeMealPlan.js` - Room type meal plans
24. ✅ `src/services/property/host/specialRateService.js` - Special rates
25. ✅ `src/services/property/host/specialRateApplicationService.js` - Special rate applications
26. ✅ `src/services/property/agent/agentOperationsService.js` - Agent operations
27. ✅ `src/services/property/agent/authService.js` - Agent auth service
28. ✅ `src/services/property/frontdesk/adminFrontDeskService.js` - Admin front desk
29. ✅ `src/services/property/frontdesk/hostFrontDeskService.js` - Host front desk
30. ✅ `src/services/property/frontdesk/frontdeskcommon.js` - Front desk common
31. ✅ `src/services/property/frontdesk/paymentService.js` - Front desk payments

### **Other Services**
32. ✅ `src/services/search/propertySearchService.js` - Property search
33. ✅ `src/services/roomsService.js` - Rooms service
34. ✅ `src/services/callbackRequest/callbackRequestService.js` - Callback requests
35. ✅ `src/services/cancellationRequest/cancellationRequestService.js` - Cancellation requests
36. ✅ `src/services/review/reviewService.js` - Reviews
37. ✅ `src/services/guests/guestsService.js` - Guests service
38. ✅ `src/services/User/userService.js` - User service
39. ✅ `src/services/siteConfig/siteConfigService.js` - Site configuration
40. ✅ `src/services/media/mediaService.js` - Media service
41. ✅ `src/services/media/agentMediaService.js` - Agent media
42. ✅ `src/services/agent/agetUpdate.js` - Agent update

---

## 🛣️ Routes to Test (3 files)

1. ✅ `src/routes/ProtectedRoute.jsx` - User/Agent protected routes
2. ✅ `src/routes/AdminProtectedRoute.jsx` - Admin protected routes
3. ✅ `src/routes/HostProtectedRoute.jsx` - Host protected routes

---

## 🗄️ Store/Redux to Test (6 files)

1. ✅ `src/store/store.js` - Redux store configuration
2. ✅ `src/store/userAuthSlice.js` - User authentication state
3. ✅ `src/store/agentAuthSlice.js` - Agent authentication state
4. ✅ `src/store/adminAuthSlice.js` - Admin authentication state
5. ✅ `src/store/hostAuthSlice.js` - Host authentication state
6. ✅ `src/store/propertySlice.js` - Property state

---

## 🎯 Core App Files

1. ✅ `src/App.jsx` - Main app component (routes)
2. ✅ `src/main.jsx` - App entry point
3. ✅ `src/index.css` - Global styles
4. ✅ `src/App.css` - App styles

---

## 🔑 Context Files

1. ✅ `src/context/SearchContext.jsx` - Search context provider

---

## 🧰 Utility Files

1. ✅ `src/utils/authHelpers.js` - Authentication helpers
2. ✅ `src/utils/bookingCapacityPricing.js` - Booking pricing calculations
3. ✅ `src/utils/calendarDataProcessor.js` - Calendar data processing
4. ✅ `src/utils/findrole.js` - Role detection utility

---

## 📊 TestSprite Testing Priority

### **Phase 1: Critical Flows** (Week 1)
- ✅ User Authentication (LoginPage → OtpVerification → UserSignupModal)
- ✅ Payment Flow (RoomSection → paymentService → Razorpay)
- ✅ Booking Flow (DetialsPage → BookingSuccess/BookingFailure)
- ✅ Property Search (FindProperty → DetialsPage)

### **Phase 2: Core Features** (Week 2)
- ✅ User Profile Management
- ✅ Booking Management
- ✅ Agent Authentication & Dashboard
- ✅ Admin Authentication & Dashboard

### **Phase 3: Supporting Features** (Week 3)
- ✅ Property Management (Admin/Host)
- ✅ Front Desk Operations
- ✅ Inventory Management
- ✅ Static Pages

---

## 🎯 Key Files for Razorpay Testing

**CRITICAL - Payment Integration:**
1. ✅ `src/services/paymentService.js` - Razorpay order creation & polling
2. ✅ `src/components/RoomSection.jsx` - Payment trigger (handlePayment function)
3. ✅ `src/pages/BookingSuccess.jsx` - Payment success handling
4. ✅ `src/pages/BookingFailure.jsx` - Payment failure handling

**Payment Flow:**
```
RoomSection.jsx (handlePayment)
  → paymentService.createOrder()
  → Razorpay Checkout
  → paymentService.pollBookingStatus()
  → BookingSuccess.jsx or BookingFailure.jsx
```

---

## 📝 Summary

**Total Files to Test:**
- **Pages:** 69 files
- **Components:** 71+ files
- **Services:** 54+ files
- **Routes:** 3 files
- **Store:** 6 files
- **Core:** 4 files
- **Context:** 1 file
- **Utils:** 4 files

**Total: ~212 files**

---

## 🚀 Next Steps

1. ✅ **List created** - All files identified
2. ⏭️ **Configure TestSprite** - Set up TestSprite configuration
3. ⏭️ **Create test plan** - Prioritize test scenarios
4. ⏭️ **Generate tests** - Create TestSprite test files
5. ⏭️ **Run tests** - Execute and find issues

---

**Ready for TestSprite configuration!** 🎯

