import { useSelector } from "react-redux";
import BookingList from "../../components/shared/bookingList/bookingList";

export default function Host_allbookings() {
  const hostAuth = useSelector((state) => state.hostAuth);
  const hostId = hostAuth?.id;
  const hasSession = Boolean(hostAuth?.hostAccessToken && hostId);

  if (!hasSession) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
          <h2 className="text-lg font-semibold mb-2">Host Session Required</h2>
          <p className="text-sm">
            Please sign in as a host to view your property bookings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BookingList
      title="My Property Bookings"
      role="host"
      entityId={hostId}
      emptyStateMessage="No bookings found for your properties."
    />
  );
}
