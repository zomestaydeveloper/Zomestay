import { useState, useEffect } from "react";
import paymentsService from "../../services/payments/paymentsService";
import { Loader2 } from "lucide-react";
import NotificationModal from "../NotificationModal";

/**
 * Common AllPayments Component
 * 
 * @param {Object} props
 * @param {string} props.propertyId - Property ID (required for host, optional for admin)
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {string} props.title - Custom title for the page (optional)
 */
export default function AllPayments({ propertyId = null, isAdmin = false, title = "Payments & Transactions" }) {
  const [payments, setPayments] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // Track loading state for each action
  
  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Filters
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch payment statuses
  const fetchPaymentStatuses = async () => {
    try {
      const response = await paymentsService.getPaymentStatuses();
      if (response?.data?.success) {
        setPaymentStatuses(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching payment statuses:", err);
    }
  };

  // Fetch payments based on role
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (isAdmin) {
        // Admin: Get all payments
        response = await paymentsService.getAllPayments();
      } else {
        // Host: Get payments for specific property
        if (!propertyId) {
          setError("Property ID is required for host");
          return;
        }
        response = await paymentsService.getPropertyPayments(propertyId);
      }

      if (response?.data?.success) {
        setPayments(response.data.data || []);
        setError(null);
      } else {
        const errorMessage = response?.data?.message || "Failed to fetch payments";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      const errorMessage = err?.response?.data?.message || "Failed to fetch payments";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentStatuses();
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, isAdmin]);

  // Handle payment status update
  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      setActionLoading((prev) => ({ ...prev, [paymentId]: true }));

      const response = await paymentsService.updatePaymentStatus(paymentId, newStatus);

      if (response?.data?.success) {
        // Update local state
        setPayments((prev) =>
          prev.map((payment) =>
            payment.id === paymentId
              ? { ...payment, status: newStatus }
              : payment
          )
        );
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: response.data.message || "Payment status updated successfully",
        });
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: response?.data?.message || "Failed to update payment status",
        });
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      const errorMessage = err?.response?.data?.message || "Failed to update payment status";
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [paymentId]: false }));
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

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      case 'REFUND_INITIATED':
        return 'text-blue-600 bg-blue-50';
      case 'REFUND_COMPLETED':
        return 'text-purple-600 bg-purple-50';
      case 'REFUND_FAILED':
        return 'text-red-600 bg-red-50';
      case 'REFUND_NOT_APPLICABLE':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Format payment method
  const formatPaymentMethod = (method) => {
    const methods = {
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'upi': 'UPI',
      'net_banking': 'Net Banking',
      'wallet': 'Wallet',
      'razorpay': 'Razorpay',
    };
    return methods[method] || method;
  };

  // Format status for display
  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === "All" || payment.paymentMethod === filterMethod;
    const matchesStatus = filterStatus === "All" || payment.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  // Get unique payment methods
  const paymentMethods = ["All", ...new Set(payments.map((p) => p.paymentMethod))];
  const statuses = ["All", ...paymentStatuses];

  // Calculate statistics
  const totalRevenue = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunds = payments
    .filter((p) => p.status === 'REFUND_COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalFailed = payments
    .filter((p) => p.status === 'FAILED')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading payments...
        </div>
      </div>
    );
  }

  if (error && payments.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading payments</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchPayments}
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
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-900">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">Paid payments</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-800">Pending Payments</h3>
          <p className="text-2xl font-bold text-yellow-900">₹{totalPending.toLocaleString()}</p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting confirmation</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Total Refunds</h3>
          <p className="text-2xl font-bold text-red-900">₹{totalRefunds.toLocaleString()}</p>
          <p className="text-xs text-red-600 mt-1">Refunded payments</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800">Failed Payments</h3>
          <p className="text-2xl font-bold text-gray-900">₹{totalFailed.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">Failed transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search customer, property, transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method === "All" ? "All Methods" : formatPaymentMethod(method)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Statuses" : formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full min-w-[1200px] bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Transaction ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Customer
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Property
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Booking Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Method
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
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.transactionID}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    <div>
                      <div className="font-medium">{payment.customerName}</div>
                      <div className="text-xs text-gray-500">{payment.customerEmail}</div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="max-w-[200px] truncate" title={payment.propertyName}>
                        {payment.propertyName}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {payment.bookingNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatPaymentMethod(payment.paymentMethod)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {formatStatus(payment.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="relative">
                      <select
                        value={payment.status}
                        onChange={(e) => handleStatusUpdate(payment.id, e.target.value)}
                        disabled={actionLoading[payment.id]}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      {actionLoading[payment.id] && (
                        <Loader2 className="absolute right-2 top-1.5 h-3 w-3 animate-spin text-gray-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

