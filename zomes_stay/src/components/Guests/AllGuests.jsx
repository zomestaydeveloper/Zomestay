import { useState, useEffect } from "react";
import guestsService from "../../services/guests/guestsService";
import { Loader2 } from "lucide-react";
import NotificationModal from "../NotificationModal";

/**
 * Common AllGuests Component
 * 
 * @param {Object} props
 * @param {string} props.propertyId - Property ID (required for host, optional for admin)
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {string} props.title - Custom title for the page (optional)
 */
export default function AllGuests({ propertyId = null, isAdmin = false, title = "Guest Management" }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // Track loading state for each action
  
  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'success', // 'success', 'error', 'info', 'warning'
    title: '',
    message: '',
  });

  // Fetch guests based on role
  const fetchGuests = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (isAdmin) {
        // Admin: Get all guests
        response = await guestsService.getAllGuests();
      } else {
        // Host: Get guests for specific property
        if (!propertyId) {
          setError("Property ID is required for host");
          return;
        }
        response = await guestsService.getPropertyGuests(propertyId);
      }

      if (response?.data?.success) {
        setGuests(response.data.data || []);
        setError(null); // Clear any previous errors
      } else {
        const errorMessage = response?.data?.message || "Failed to fetch guests";
        setError(errorMessage);
        // Don't show modal for initial load errors - error UI will handle it
      }
    } catch (err) {
      console.error("Error fetching guests:", err);
      const errorMessage = err?.response?.data?.message || "Failed to fetch guests";
      setError(errorMessage);
      // Don't show modal for initial load errors - error UI will handle it
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, isAdmin]);

  // Handle block/unblock toggle
  const handleBlockToggle = async (guestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [guestId]: true }));

      const response = await guestsService.toggleBlockGuest(guestId);

      if (response?.data?.success) {
        // Update local state
        setGuests((prev) =>
          prev.map((guest) =>
            guest.guestId === guestId
              ? { ...guest, isBlocked: !guest.isBlocked }
              : guest
          )
        );
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: response.data.message || "Guest status updated successfully",
        });
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: response?.data?.message || "Failed to update guest status",
        });
      }
    } catch (err) {
      console.error("Error toggling guest block status:", err);
      const errorMessage = err?.response?.data?.message || "Failed to update guest status";
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [guestId]: false }));
    }
  };

  // Close modal handler
  const closeModal = () => {
    setModal({
      isOpen: false,
      type: 'success',
      title: '',
      message: '',
    });
  };

  const getStatusDisplay = (isBlocked) => {
    if (isBlocked) {
      return {
        text: 'Blocked',
        className: 'text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-medium'
      };
    }
    return {
      text: 'Active',
      className: 'text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium'
    };
  };

  const getActionButton = (guest) => {
    const isLoading = actionLoading[guest.guestId];
    
    if (guest.isBlocked) {
      return {
        text: isLoading ? 'Unblocking...' : 'Unblock',
        className: 'inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        disabled: isLoading
      };
    }
    return {
      text: isLoading ? 'Blocking...' : 'Block',
      className: 'inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      disabled: isLoading
    };
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading guests...
        </div>
      </div>
    );
  }

  if (error && guests.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading guests</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchGuests}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>
      
      {error && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Fixed overflow container */}
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full min-w-[700px] bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Guest ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Phone Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Email ID
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Properties
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Total Bookings
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {guests.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No guests found
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.guestId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {guest.userId 
                      ? `${guest.userId.substring(0, 8)}...` 
                      : guest.guestEmail || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {guest.guestName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {guest.guestPhone || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="max-w-[250px] truncate" title={guest.guestEmail}>
                      {guest.guestEmail || 'N/A'}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="max-w-[200px]">
                        {guest.properties && guest.properties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {guest.properties.slice(0, 2).map((prop, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                title={prop.propertyTitle}
                              >
                                {prop.propertyTitle?.substring(0, 20) || 'Property'}
                                {prop.propertyTitle?.length > 20 ? '...' : ''}
                              </span>
                            ))}
                            {guest.properties.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                +{guest.properties.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No properties</span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {guest.totalBookings || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={getStatusDisplay(guest.isBlocked).className}>
                      {getStatusDisplay(guest.isBlocked).text}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleBlockToggle(guest.guestId)}
                      disabled={actionLoading[guest.guestId]}
                      className={getActionButton(guest).className}
                    >
                      {actionLoading[guest.guestId] && (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      )}
                      {getActionButton(guest).text}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Guests</h3>
          <p className="text-2xl font-bold text-blue-900">{guests.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Active Guests</h3>
          <p className="text-2xl font-bold text-green-900">
            {guests.filter((g) => !g.isBlocked).length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">Blocked Guests</h3>
          <p className="text-2xl font-bold text-red-900">
            {guests.filter((g) => g.isBlocked).length}
          </p>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
      />
    </div>
  );
}

