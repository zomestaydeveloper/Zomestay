# Agent Dashboard Refactoring Guide

## Component Structure

```
components/Agent/
├── AgentDashboardHeader.jsx      # Header with logo, name, logout
├── AgentDashboardTabs.jsx        # Tab navigation (Bookings, Profile, Password)
├── BookingsTab/
│   ├── index.jsx                 # Main BookingsTab container
│   ├── BookingsHeader.jsx        # "Start New Booking" card
│   ├── BookingsSearchFilter.jsx  # Search and filter controls
│   ├── BookingsList.jsx          # List container (handles table/card switching)
│   ├── BookingsTable.jsx         # Desktop table view
│   ├── BookingsCard.jsx          # Mobile card view
│   ├── BookingsPagination.jsx    # Pagination controls
│   └── EmptyBookings.jsx         # Empty state component
├── ProfileTab/
│   ├── index.jsx                 # Profile tab container
│   └── ProfileForm.jsx           # Profile edit form
├── PasswordTab/
│   ├── index.jsx                 # Password tab container
│   └── PasswordForm.jsx          # Password change form
├── Modals/
│   ├── BookingDetailsModal.jsx   # Booking details modal
│   ├── RoomDetailsModal.jsx      # Room details modal
│   └── InfoModal.jsx             # Generic info/success/error modal
└── hooks/
    ├── useBookings.js            # Bookings data fetching and management
    ├── useAgentProfile.js        # Agent profile management
    └── useBookingActions.js      # Booking actions (view, cancel, etc.)

utils/Agent/
├── bookingUtils.js               # Booking formatting, status colors, etc.
└── validation.js                 # Form validation utilities
```

## Component Responsibilities

### Layout Components
- **AgentDashboardHeader**: Top header with branding and logout
- **AgentDashboardTabs**: Tab navigation bar

### BookingsTab Components
- **BookingsTab**: Container that orchestrates bookings functionality
- **BookingsHeader**: Action card for starting new bookings
- **BookingsSearchFilter**: Search input and filter dropdowns
- **BookingsList**: Smart component that switches between table/card views
- **BookingsTable**: Desktop table view with all columns
- **BookingsCard**: Mobile-optimized card view
- **BookingsPagination**: Pagination controls for both mobile/desktop
- **EmptyBookings**: Empty state when no bookings found

### ProfileTab Components
- **ProfileTab**: Container for profile editing
- **ProfileForm**: Form fields for agent profile

### PasswordTab Components
- **PasswordTab**: Container for password changes
- **PasswordForm**: Password change form with validation

### Modal Components
- **BookingDetailsModal**: Full booking details display
- **RoomDetailsModal**: Room selection details
- **InfoModal**: Reusable modal for success/error/info messages

### Custom Hooks
- **useBookings**: 
  - Fetch bookings from API
  - Handle pagination
  - Manage search and filters
  - Booking state management

- **useAgentProfile**:
  - Load agent profile
  - Update profile
  - Form state management

- **useBookingActions**:
  - Handle view booking
  - Handle cancellation
  - Handle cancellation requests

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be reused or tested independently
3. **Maintainability**: Easier to find and fix bugs
4. **Readability**: Smaller files are easier to understand
5. **Testability**: Individual components can be unit tested
6. **Scalability**: Easy to add new features or tabs

## Implementation Steps

1. Create folder structure
2. Extract header component
3. Extract tab navigation
4. Extract bookings tab (most complex)
5. Extract profile and password tabs
6. Extract modal components
7. Create custom hooks
8. Create utility functions
9. Update main AgentDashboard to use new components
10. Test each component individually
