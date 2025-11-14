import AllGuests from "../../components/Guests/AllGuests";

/**
 * Admin RegisteredUsers Page
 * Shows all guests from all properties
 */
export default function RegisteredUsers() {
  return <AllGuests isAdmin={true} title="Guest Management - All Guests" />;
}