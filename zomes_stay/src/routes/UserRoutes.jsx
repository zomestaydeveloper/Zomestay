import { Routes, Route } from "react-router-dom";
import Body from "../components/Body";
import UserProfile from "../pages/UserProfile";
import UserBookings from "../pages/UserBookings";
import { UserProtectedRoute } from "./ProtectedRoute";

/**
 * UserRoutes
 * - All user-protected routes that require user authentication
 * - Uses UserProtectedRoute to guard access
 * - Checks token existence and expiration
 */
const UserRoutes = () => {
  return (
    <Routes>
      {/* User Protected Routes */}
      <Route
        path="/app"
        element={
          <UserProtectedRoute redirectTo="/login">
            <Body />
          </UserProtectedRoute>
        }
      >
        {/* User-specific protected pages */}
        <Route path="user_profile" element={<UserProfile />} />
        <Route path="bookings" element={<UserBookings />} />
      </Route>
    </Routes>
  );
};

export default UserRoutes;

