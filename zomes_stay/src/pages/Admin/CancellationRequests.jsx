import React, { useEffect, useState } from 'react';
import cancellationRequestService from '../../services/cancellationRequest/cancellationRequestService';
import NotificationModal from '../../components/NotificationModal';
import { Loader2, CheckCircle, X, AlertCircle, Calendar, Phone, Mail, Building2, User, FileText, Eye } from 'lucide-react';

const CancellationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(''); // 'pending', 'approved', 'rejected', or '' for all
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const openNotify = (type, title, message) => setNotification({ isOpen: true, type, title, message });
  const closeNotify = () => setNotification(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter })
      };
      const res = await cancellationRequestService.getAll(params);
      if (res.data?.success) {
        setRequests(res.data.data.cancellationRequests || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
        setTotal(res.data.data.pagination?.total || 0);
      } else {
        openNotify('error', 'Error', res.data?.message || 'Failed to load cancellation requests');
      }
    } catch (error) {
      openNotify('error', 'Error', 'Failed to load cancellation requests');
    } finally {
      setLoading(false);
    }
  };

  // Check if booking is future or today (can be approved/rejected)
  const canApproveReject = (request) => {
    if (!request?.booking?.startDate) return false;
    const checkInDate = new Date(request.booking.startDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    checkInDate.setUTCHours(0, 0, 0, 0);
    return checkInDate >= today; // Future or today
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
      approved: { color: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setShowApproveModal(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setShowRejectModal(true);
  };

  const openViewModal = (request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessingId(selectedRequest.id);
      const res = await cancellationRequestService.approve(selectedRequest.id, {
        adminNotes: adminNotes.trim() || null
      });
      
      if (res.data?.success) {
        openNotify('success', 'Approved', 'Cancellation request approved successfully');
        setShowApproveModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        fetchRequests();
      } else {
        openNotify('error', 'Error', res.data?.message || 'Failed to approve cancellation request');
      }
    } catch (error) {
      openNotify('error', 'Error', 'Failed to approve cancellation request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !adminNotes.trim()) {
      openNotify('warning', 'Required', 'Admin notes are required when rejecting a request');
      return;
    }

    try {
      setProcessingId(selectedRequest.id);
      const res = await cancellationRequestService.reject(selectedRequest.id, {
        adminNotes: adminNotes.trim()
      });
      
      if (res.data?.success) {
        openNotify('success', 'Rejected', 'Cancellation request rejected successfully');
        setShowRejectModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        fetchRequests();
      } else {
        openNotify('error', 'Error', res.data?.message || 'Failed to reject cancellation request');
      }
    } catch (error) {
      openNotify('error', 'Error', 'Failed to reject cancellation request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cancellation Requests</h1>
              <p className="text-sm text-gray-600 mt-1">Manage and review cancellation requests</p>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 font-medium">Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Requests</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Processed</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {requests.filter(r => r.status !== 'pending').length}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No cancellation requests found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Booking</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Property</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Guest</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check-in</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map((request) => {
                      const canAction = request.status === 'pending' && canApproveReject(request);
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{request.bookingNumber}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(request.booking?.totalAmount)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{request.booking?.property?.title || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{request.booking?.guestName || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{request.role}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{formatDate(request.booking?.startDate)}</div>
                            <div className="text-xs text-gray-500">to {formatDate(request.booking?.endDate)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 max-w-xs truncate">{request.reason}</div>
                            {request.customReason && (
                              <div className="text-xs text-gray-500 max-w-xs truncate" title={request.customReason}>
                                {request.customReason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openViewModal(request)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {canAction ? (
                                <>
                                  <button
                                    onClick={() => openApproveModal(request)}
                                    disabled={processingId === request.id}
                                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Approve"
                                  >
                                    {processingId === request.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Approve'
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(request)}
                                    disabled={processingId === request.id}
                                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Reject"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : request.status === 'pending' ? (
                                <span className="text-xs text-gray-500 italic">Past booking</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-green-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Approve Cancellation Request</h3>
                </div>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-white/90 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Approving this request will cancel the booking. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Booking Number</label>
                  <div className="text-sm text-gray-900">{selectedRequest.bookingNumber}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Property</label>
                  <div className="text-sm text-gray-900">{selectedRequest.booking?.property?.title || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Guest</label>
                  <div className="text-sm text-gray-900">{selectedRequest.booking?.guestName || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cancellation Reason</label>
                  <div className="text-sm text-gray-900">{selectedRequest.reason}</div>
                  {selectedRequest.customReason && (
                    <div className="text-sm text-gray-600 mt-1">{selectedRequest.customReason}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Admin Notes (Optional)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Add any notes about this approval..."
                  />
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processingId === selectedRequest.id}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processingId === selectedRequest.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-red-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Reject Cancellation Request</h3>
                </div>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-white/90 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> Rejecting this request will keep the booking active. Admin notes are required.
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Booking Number</label>
                  <div className="text-sm text-gray-900">{selectedRequest.bookingNumber}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Property</label>
                  <div className="text-sm text-gray-900">{selectedRequest.booking?.property?.title || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Guest</label>
                  <div className="text-sm text-gray-900">{selectedRequest.booking?.guestName || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cancellation Reason</label>
                  <div className="text-sm text-gray-900">{selectedRequest.reason}</div>
                  {selectedRequest.customReason && (
                    <div className="text-sm text-gray-600 mt-1">{selectedRequest.customReason}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Admin Notes <span className="text-red-600">*</span></label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={4}
                    placeholder="Please provide a reason for rejection..."
                    required
                  />
                  {!adminNotes.trim() && (
                    <p className="text-xs text-red-600 mt-1">Admin notes are required</p>
                  )}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === selectedRequest.id || !adminNotes.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processingId === selectedRequest.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Cancellation Request Details</h3>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white/90 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Request Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Request Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Request ID</label>
                    <div className="text-sm text-gray-900 font-mono">{selectedRequest.id}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Requested By</label>
                    <div className="text-sm text-gray-900 capitalize">{selectedRequest.role}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Contact Number</label>
                    <div className="text-sm text-gray-900">{selectedRequest.contactNumber}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Reason</label>
                    <div className="text-sm text-gray-900">{selectedRequest.reason}</div>
                  </div>
                  {selectedRequest.customReason && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Additional Details</label>
                      <div className="text-sm text-gray-900">{selectedRequest.customReason}</div>
                    </div>
                  )}
                  {selectedRequest.adminNotes && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Admin Notes</label>
                      <div className="text-sm text-gray-900">{selectedRequest.adminNotes}</div>
                    </div>
                  )}
                  {selectedRequest.reviewer && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Reviewed By</label>
                      <div className="text-sm text-gray-900">{selectedRequest.reviewer.name}</div>
                    </div>
                  )}
                  {selectedRequest.reviewedAt && (
                    <div>
                      <label className="text-xs text-gray-600">Reviewed At</label>
                      <div className="text-sm text-gray-900">{formatDate(selectedRequest.reviewedAt)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Booking Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Booking Number</label>
                    <div className="text-sm text-gray-900 font-mono">{selectedRequest.bookingNumber}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Booking Status</label>
                    <div className="text-sm text-gray-900 capitalize">{selectedRequest.booking?.status || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Property</label>
                    <div className="text-sm text-gray-900">{selectedRequest.booking?.property?.title || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Total Amount</label>
                    <div className="text-sm text-gray-900 font-semibold">{formatCurrency(selectedRequest.booking?.totalAmount)}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Check-in</label>
                    <div className="text-sm text-gray-900">{formatDate(selectedRequest.booking?.startDate)}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Check-out</label>
                    <div className="text-sm text-gray-900">{formatDate(selectedRequest.booking?.endDate)}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Guest Name</label>
                    <div className="text-sm text-gray-900">{selectedRequest.booking?.guestName || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Guest Email</label>
                    <div className="text-sm text-gray-900">{selectedRequest.booking?.guestEmail || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Guest Phone</label>
                    <div className="text-sm text-gray-900">{selectedRequest.booking?.guestPhone || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotify}
      />
    </div>
  );
};

export default CancellationRequests;


