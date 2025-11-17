import { useCallback, useEffect, useMemo, useState } from "react";
import { bookingService } from "../../../services/property/admin";
import { X, Eye } from "lucide-react";

const PAGE_LIMIT = 20;

const INITIAL_PAGINATION = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  pages: 1,
  hasNext: false,
  hasPrev: false,
};

const ROLE_REQUIRING_ID = new Set(["host", "user", "agent"]);

const statusColor = {
  confirmed: "text-green-600 bg-green-50",
  cancelled: "text-red-600 bg-red-50",
  pending: "text-yellow-600 bg-yellow-50",
  completed: "text-blue-600 bg-blue-50",   
};

const formatAmount = (amount) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const normalizeRole = (value) => {
  if (!value) return "";
  return String(value).trim().toLowerCase();
};

const buildEmptyPagination = (page, limit = PAGE_LIMIT) => ({
  page,
  limit,
  total: 0,
  pages: 1,
  hasNext: false,
  hasPrev: page > 1,
});

export default function BookingList({
  title = "Bookings",
  role = "admin",
  entityId = "",
  extraParams = null,
  emptyStateMessage = "No bookings found for the given filters.",
  showTotals = true,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);

  const normalizedRole = useMemo(() => normalizeRole(role), [role]);
  const requiresEntityId = ROLE_REQUIRING_ID.has(normalizedRole);
  const canCancelBookings = normalizedRole === "admin";

  const extraParamsMemo = useMemo(() => {
    if (!extraParams) return {};
    return extraParams;
  }, [extraParams]);

  const fetchBookings = useCallback(
    async (signal) => {
      if (requiresEntityId && !entityId) {
        setBookings([]);
        setLoading(false);
        setPagination((prev) => ({
          ...buildEmptyPagination(page, prev.limit || PAGE_LIMIT),
        }));
        setError("Missing session details. Please sign in again.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = {
          page,
          limit: PAGE_LIMIT,
          status: statusFilter || undefined,
          search: search || undefined,
          propertyId: propertyFilter || undefined,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
          role: normalizedRole || undefined,
          entityId: entityId || undefined,
          ...extraParamsMemo,
        };

        const response = await bookingService.list(params, {
          signal,
        });

        const { data } = response;
        if (data.success) {
          setBookings(data.data || []);
          const nextPagination = data.pagination
            ? {
                page: data.pagination.page ?? page,
                limit: data.pagination.limit ?? PAGE_LIMIT,
                total: data.pagination.total ?? data.data?.length ?? 0,
                pages:
                  data.pagination.pages ??
                  Math.max(
                    1,
                    Math.ceil(
                      (data.pagination.total || 0) /
                        (data.pagination.limit || PAGE_LIMIT)
                    )
                  ),
                hasNext:
                  typeof data.pagination.hasNext === "boolean"
                    ? data.pagination.hasNext
                    : (data.pagination.page ?? page) *
                        (data.pagination.limit ?? PAGE_LIMIT) <
                      (data.pagination.total ?? 0),
                hasPrev:
                  typeof data.pagination.hasPrev === "boolean"
                    ? data.pagination.hasPrev
                    : (data.pagination.page ?? page) > 1,
              }
            : buildEmptyPagination(page);
          setPagination(nextPagination);
        } else {
          throw new Error(data.message || "Failed to fetch bookings");
        }
      } catch (err) {
        if (signal?.aborted) return;
        console.error("Failed to fetch bookings:", err);
        setBookings([]);
        setPagination(buildEmptyPagination(page));
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch bookings"
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      dateRange.end,
      dateRange.start,
      entityId,
    page,
    search,
    statusFilter,
    propertyFilter,
    normalizedRole,
    extraParamsMemo,
    requiresEntityId,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchBookings(controller.signal);

    return () => controller.abort();
  }, [fetchBookings]);

  const handleCancel = useCallback(
    async (booking) => {
      if (!booking?.id) {
        return;
      }

      const confirmation = window.confirm(
        "Are you sure you want to cancel this booking?"
      );
      if (!confirmation) {
        return;
      }

      const reasonInput = window.prompt(
        "Please provide a reason for cancellation:",
        ""
      );
      if (reasonInput === null) {
        return;
      }

      const reason = reasonInput.trim();
      if (!reason) {
        setError("Cancellation reason is required.");
        return;
      }

      setCancellingId(booking.id);
      setError("");

      try {
        await bookingService.cancel(booking.id, {
          reason,
          notes: "",
        });
        await fetchBookings();
      } catch (err) {
        console.error("Failed to cancel booking:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to cancel booking"
        );
      } finally {
        setCancellingId(null);
      }
    },
    [fetchBookings]
  );

  const totals = useMemo(() => {
    const summary = {
      total: pagination.total ?? bookings.length,
      confirmed: bookings.filter((b) => b.status?.toLowerCase() === "confirmed").length,
      pending: bookings.filter((b) => b.status?.toLowerCase() === "pending").length,
      cancelled: bookings.filter((b) => b.status?.toLowerCase() === "cancelled").length,
    };
    return summary;
  }, [bookings, pagination.total]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPropertyFilter("");
    setDateRange({ start: "", end: "" });
    setPage(1);
  };

  const getStatusClass = (statusValue) => {
    if (!statusValue) return "text-gray-600 bg-gray-50";
    return statusColor[statusValue.toLowerCase()] || "text-gray-600 bg-gray-50";
  };

  const handleViewRoomDetails = (booking) => {
    setSelectedBooking(booking);
    setShowRoomDetailsModal(true);
  };

  const closeRoomDetailsModal = () => {
    setShowRoomDetailsModal(false);
    setSelectedBooking(null);
  };

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest / property"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Reset
          </button>
        </form>
      </div>

      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading bookings…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{emptyStateMessage}</div>
        ) : (
          <table className="w-full min-w-[900px] bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Booking #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Guest
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Room Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Check-In
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Check-Out
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Nights
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Guests
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Payment Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Status
                </th>
                {canCancelBookings && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.bookingNumber || booking.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex flex-col">
                      <span className="font-medium">{booking?.guest?.name || "—"}</span>
                      <span className="text-xs text-gray-500">
                        {booking?.guest?.email || "—"}
                      </span>
                      {booking?.guest?.phone && (
                        <span className="text-xs text-gray-500">
                          {booking.guest.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div
                      className="max-w-[220px] truncate"
                      title={booking?.property?.name}
                    >
                      {booking?.property?.name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {booking?.roomSelections && booking.roomSelections.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleViewRoomDetails(booking)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{booking.roomSelections.length} Room Type{booking.roomSelections.length !== 1 ? 's' : ''}</span>
                      </button>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(booking.checkIn)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(booking.checkOut)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {booking.nights ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {booking.totalGuests ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatAmount(booking.totalAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {booking.paymentStatus || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border border-transparent ${getStatusClass(
                        booking.status
                      )}`}
                    >
                      {booking.status || "—"}
                    </span>
                  </td>
                  {canCancelBookings && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {booking.status?.toLowerCase() === "cancelled" ? (
                        <span className="text-gray-500">Already cancelled</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCancel(booking)}
                          disabled={cancellingId === booking.id || loading}
                          className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {cancellingId === booking.id
                            ? "Cancelling..."
                            : "Cancel Booking"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showTotals && (
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-3 flex-wrap">
            <div className="bg-blue-50 px-4 py-3 rounded-lg">
              <p className="text-xs font-medium text-blue-800 uppercase">Total Bookings</p>
              <p className="text-lg font-bold text-blue-900">{totals.total}</p>
            </div>
            <div className="bg-green-50 px-4 py-3 rounded-lg">
              <p className="text-xs font-medium text-green-800 uppercase">Confirmed</p>
              <p className="text-lg font-bold text-green-900">{totals.confirmed}</p>
            </div>
            <div className="bg-yellow-50 px-4 py-3 rounded-lg">
              <p className="text-xs font-medium text-yellow-800 uppercase">Pending</p>
              <p className="text-lg font-bold text-yellow-900">{totals.pending}</p>
            </div>
            <div className="bg-red-50 px-4 py-3 rounded-lg">
              <p className="text-xs font-medium text-red-800 uppercase">Cancelled</p>
              <p className="text-lg font-bold text-red-900">{totals.cancelled}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={!pagination.hasPrev || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((prev) =>
                  pagination.hasNext && !loading ? prev + 1 : prev
                )
              }
              disabled={!pagination.hasNext || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {showRoomDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Room Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Booking: {selectedBooking.bookingNumber}
                </p>
              </div>
              <button
                onClick={closeRoomDetailsModal}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              {selectedBooking.roomSelections && selectedBooking.roomSelections.length > 0 ? (
                <div className="space-y-4">
                  {selectedBooking.roomSelections.map((selection, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">
                            {selection.roomType || "Room Type"}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {selection.guests} guest{selection.guests !== 1 ? 's' : ''}
                            {selection.children > 0 && `, ${selection.children} child${selection.children !== 1 ? 'ren' : ''}`}
                          </p>
                        </div>
                        {selection.mealPlan && (
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {selection.mealPlan.name}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {selection.mealPlan.kind}
                            </p>
                          </div>
                        )}
                      </div>

                      {selection.rooms && selection.rooms.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Rooms ({selection.rooms.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selection.rooms.map((roomName, roomIdx) => (
                              <div
                                key={roomIdx}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md"
                              >
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-700">{roomName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No room details available
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex justify-end">
              <button
                onClick={closeRoomDetailsModal}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

