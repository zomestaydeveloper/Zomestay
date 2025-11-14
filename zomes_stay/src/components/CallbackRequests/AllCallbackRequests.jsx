import { useState, useEffect } from "react";
import { callbackRequestService } from "../../services";
import { Loader2, Phone, Search, Eye, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import NotificationModal from "../NotificationModal";

/**
 * Common AllCallbackRequests Component
 * 
 * @param {Object} props
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {string} props.title - Custom title for the page (optional)
 */
export default function AllCallbackRequests({ isAdmin = false, title = "Callback Requests" }) {
  const [callbackRequests, setCallbackRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  
  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Filters and pagination
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState(null);
  const itemsPerPage = 10;

  // Status options
  const statusOptions = ["All", "pending", "contacted", "completed", "cancelled"];

  // Fetch callback requests
  const fetchCallbackRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(filterStatus !== "All" && { status: filterStatus }),
        ...(searchTerm && { search: searchTerm }),
      };

      const response = await callbackRequestService.getAllCallbackRequests(params);

      if (response?.data?.success) {
        setCallbackRequests(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
          setCurrentPage(response.data.pagination.page || 1);
          setTotalPages(response.data.pagination.pages || 1);
          setTotal(response.data.pagination.total || 0);
        }
        setError(null);
      } else {
        const errorMessage = response?.data?.message || "Failed to fetch callback requests";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Error fetching callback requests:", err);
      const errorMessage = err?.response?.data?.message || "Failed to fetch callback requests";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbackRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus]);

  // Handle status update
  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));

      const response = await callbackRequestService.updateCallbackRequestStatus(requestId, { status: newStatus });

      if (response?.data?.success) {
        // Update local state
        setCallbackRequests((prev) =>
          prev.map((request) =>
            request.id === requestId
              ? { ...request, status: newStatus }
              : request
          )
        );
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: response.data.message || "Callback request status updated successfully",
        });
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: response?.data?.message || "Failed to update callback request status",
        });
      }
    } catch (err) {
      console.error("Error updating callback request status:", err);
      const errorMessage = err?.response?.data?.message || "Failed to update callback request status";
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Handle delete
  const handleDelete = async (requestId) => {
    if (!window.confirm("Are you sure you want to delete this callback request?")) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [`delete-${requestId}`]: true }));

      const response = await callbackRequestService.deleteCallbackRequest(requestId);

      if (response?.data?.success) {
        // Remove from local state
        setCallbackRequests((prev) => prev.filter((request) => request.id !== requestId));
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: response.data.message || "Callback request deleted successfully",
        });
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: response?.data?.message || "Failed to delete callback request",
        });
      }
    } catch (err) {
      console.error("Error deleting callback request:", err);
      const errorMessage = err?.response?.data?.message || "Failed to delete callback request";
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`delete-${requestId}`]: false }));
    }
  };

  // Handle view details
  const handleView = (request) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
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

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'contacted':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchCallbackRequests();
  };

  // Calculate statistics
  const totalPending = callbackRequests.filter((r) => r.status === 'pending').length;
  const totalContacted = callbackRequests.filter((r) => r.status === 'contacted').length;
  const totalCompleted = callbackRequests.filter((r) => r.status === 'completed').length;
  const totalCancelled = callbackRequests.filter((r) => r.status === 'cancelled').length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading callback requests...
        </div>
      </div>
    );
  }

  if (error && callbackRequests.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading callback requests</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchCallbackRequests}
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h3 className="text-sm font-medium text-yellow-800">Pending</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{totalPending}</p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting contact</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-800">Contacted</h3>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalContacted}</p>
          <p className="text-xs text-blue-600 mt-1">In progress</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium text-green-800">Completed</h3>
          </div>
          <p className="text-2xl font-bold text-green-900">{totalCompleted}</p>
          <p className="text-xs text-green-600 mt-1">Resolved</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-800">Total</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total || callbackRequests.length}</p>
          <p className="text-xs text-gray-600 mt-1">All requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Statuses" : formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Callback Requests Table */}
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full min-w-[1000px] bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Request ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {callbackRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No callback requests found
                </td>
              </tr>
            ) : (
              callbackRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {request.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    <div className="max-w-[200px] truncate" title={request.email}>
                      {request.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {request.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {request.property ? (
                      <div className="max-w-[200px] truncate" title={request.property.title}>
                        {request.property.title}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {formatStatus(request.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(request)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusUpdate(request.id, e.target.value)}
                        disabled={actionLoading[request.id]}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                      >
                        {statusOptions.filter(s => s !== "All").map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      {actionLoading[request.id] && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                      <button
                        onClick={() => handleDelete(request.id)}
                        disabled={actionLoading[`delete-${request.id}`]}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        {actionLoading[`delete-${request.id}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * itemsPerPage) + 1} to {Math.min(pagination.page * itemsPerPage, pagination.total)} of {pagination.total} requests
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev || loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              disabled={!pagination.hasNext || loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Callback Request Details</h3>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedRequest(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedRequest.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-sm text-gray-900">{selectedRequest.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{selectedRequest.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-sm text-gray-900">{selectedRequest.phone}</p>
                </div>
                {selectedRequest.property && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                    <p className="text-sm text-gray-900">{selectedRequest.property.title}</p>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.notes}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                    {formatStatus(selectedRequest.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedRequest.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

