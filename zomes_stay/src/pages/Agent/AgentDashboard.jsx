import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutAgent, setAgentLogin } from '../../store/agentAuthSlice';
import { persistor } from '../../store/store';
import CancellationRequestModal from '../../components/shared/CancellationRequestModal';
import agentAuthService from '../../services/auth/agent_authService';
import bookingService from '../../services/property/admin/booking/bookingService';

// Import new components
import DashboardHeader from './components/DashboardHeader';
import DashboardTabs from './components/DashboardTabs';
import NewBookingCard from './components/NewBookingCard';
import BookingFilters from './components/BookingFilters';
import BookingTable from './components/BookingTable';
import BookingMobileList from './components/BookingMobileList';
import PaginationControls from './components/PaginationControls';
import ProfileView from './components/ProfileView';
import PasswordView from './components/PasswordView';
import BookingDetailsModal from './components/BookingDetailsModal';
import CancellationModal from './components/CancellationModal';
import RoomDetailsModal from './components/RoomDetailsModal';
import GenericModal from './components/GenericModal';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.agentAuth);
  const [agentInfo, setAgentInfo] = useState({});
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationNotes, setCancellationNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'upcoming', 'past'
  const [bookingsError, setBookingsError] = useState('');
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [showCancellationRequestModal, setShowCancellationRequestModal] = useState(false);
  const [cancellationRequestBooking, setCancellationRequestBooking] = useState(null);

  // Modal states
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info', // 'success', 'error', 'info'
    title: '',
    message: '',
    onClose: null
  });

  // Profile edit states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agencyName: '',
    licenseNumber: '',
    officeAddress: ''
  });

  // Password change states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Bookings data from API
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Show modal function
  const showModal = (type, title, message, onClose = null) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onClose: onClose || (() => setModal(prev => ({ ...prev, isOpen: false })))
    });
  };

  // Close modal function
  const closeModal = () => {
    if (modal.onClose) {
      modal.onClose();
    }
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  // Format date to YYYY-MM-DD
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Map API booking data to component format
  const mapBookingData = useCallback((booking) => {
    return {
      id: booking.id || '',
      bookingNumber: booking.bookingNumber || '',
      customerName: booking.guest?.name || 'N/A',
      customerEmail: booking.guest?.email || '',
      customerPhone: booking.guest?.phone || '',
      propertyName: booking.property?.name || 'N/A',
      propertyId: booking.property?.id || '',
      checkIn: booking.checkIn ? formatDate(booking.checkIn) : '',
      checkOut: booking.checkOut ? formatDate(booking.checkOut) : '',
      nights: booking.nights || 0,
      guests: booking.totalGuests || 0,
      amount: booking.totalAmount || 0,
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || null,
      roomSelections: booking.roomSelections || [], // New structure with room types, rooms, meal plans
      // Keep original data for details modal
      originalData: booking
    };
  }, []);

  // Fetch bookings from API
  const fetchBookings = useCallback(async (page = currentPage) => {
    if (!auth?.id) {
      setBookings([]);
      return;
    }

    setBookingsLoading(true);
    setBookingsError('');

    try {
      const params = {
        role: 'agent',
        entityId: auth.id,
        page: page,
        limit: 10, // Show 10 bookings per page
        search: searchQuery || undefined,
        // Apply status filter on backend if needed
        ...(bookingFilter !== 'all' && bookingFilter !== 'upcoming' && bookingFilter !== 'past' ? {} : {})
      };

      const response = await bookingService.list(params);

      if (response.data?.success) {
        const bookingsData = response.data.data || [];
        const paginationData = response.data.pagination || {};

        // Map bookings using new response structure
        let mappedBookings = bookingsData.map(mapBookingData);

        // Apply client-side date filtering if needed (upcoming/past)
        if (bookingFilter === 'upcoming' || bookingFilter === 'past') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          mappedBookings = mappedBookings.filter(booking => {
            // booking.checkOut is already a formatted date string (YYYY-MM-DD)
            const checkOutDateStr = booking.originalData?.checkOut || booking.checkOut;
            if (!checkOutDateStr) return false;

            const checkOutDate = new Date(checkOutDateStr);
            checkOutDate.setHours(0, 0, 0, 0);

            if (bookingFilter === 'upcoming') {
              return checkOutDate >= today;
            } else if (bookingFilter === 'past') {
              return checkOutDate < today;
            }
            return true;
          });
        }

        setBookings(mappedBookings);
        setPagination({
          page: paginationData.page || page,
          limit: paginationData.limit || 10,
          total: paginationData.total || 0,
          pages: paginationData.pages || 1,
          hasNext: paginationData.hasNext || false,
          hasPrev: paginationData.hasPrev || false
        });
      } else {
        throw new Error(response.data?.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load bookings';
      setBookingsError(errorMsg);
      setBookings([]);
      showModal('error', 'Error Loading Bookings', errorMsg);
    } finally {
      setBookingsLoading(false);
    }
  }, [auth?.id, searchQuery, bookingFilter, currentPage, mapBookingData]);

  // Load agent info from Redux on mount
  useEffect(() => {
    // Check if agent is authenticated
    if (!auth?.agentAccessToken) {
      navigate('/');
      return;
    }

    // Map Redux agentAuth data to agentInfo
    const agent = {
      email: auth.email || '',
      phone: auth.phone || '',
      firstName: auth.first_name || '',
      lastName: auth.last_name || '',
      profileImage: auth.profileImage || '',
      id: auth.id || '',
      agencyName: auth.agencyName || '',
      licenseNumber: auth.licenseNumber || '',
      officeAddress: auth.officeAddress || ''
    };

    setAgentInfo(agent);
    setProfileForm({
      firstName: auth.first_name || '',
      lastName: auth.last_name || '',
      email: auth.email || '',
      phone: auth.phone || '',
      agencyName: auth.agencyName || '',
      licenseNumber: auth.licenseNumber || '',
      officeAddress: auth.officeAddress || ''
    });
  }, [auth, navigate]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    if (auth?.agentAccessToken && auth?.id) {
      setCurrentPage(1);
    }
  }, [searchQuery, bookingFilter, auth?.agentAccessToken, auth?.id]);

  // Fetch bookings when component mounts or when filters/search/page change
  useEffect(() => {
    if (auth?.agentAccessToken && auth?.id) {
      fetchBookings(currentPage);
    }
  }, [auth?.agentAccessToken, auth?.id, currentPage, fetchBookings]);

  // Filter bookings - search is now handled server-side, but we keep this for client-side date filtering
  const filteredBookings = bookings;

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      await agentAuthService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear localStorage items (legacy cleanup)
      localStorage.removeItem('travel_agent_token');
      localStorage.removeItem('travelAgentToken');
      localStorage.removeItem('agent');
      localStorage.removeItem('userType');
      sessionStorage.removeItem('authToken');

      // Clear Redux agent auth state
      dispatch(logoutAgent());

      // Flush to ensure the logout action is saved to localStorage
      // DO NOT purge - that would clear all roles' data!
      // Redux Persist will automatically save only the updated slice
      await persistor.flush();

      // Navigate to login page
      navigate('/');
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      // Prepare update data (exclude email as it cannot be changed)
      const updateData = {
        firstName: profileForm.firstName || null,
        lastName: profileForm.lastName || null,
        phone: profileForm.phone || null,
        agencyName: profileForm.agencyName || null,
        licenseNumber: profileForm.licenseNumber || null,
        officeAddress: profileForm.officeAddress || null,
      };

      // Call update profile API
      const response = await agentAuthService.updateProfile(updateData);

      if (response.data?.success) {
        const updatedAgentData = response.data.data;

        // Update local state
        const updatedAgent = {
          ...agentInfo,
          firstName: updatedAgentData.firstName || '',
          lastName: updatedAgentData.lastName || '',
          phone: updatedAgentData.phone || '',
          agencyName: updatedAgentData.agencyName || '',
          licenseNumber: updatedAgentData.licenseNumber || '',
          officeAddress: updatedAgentData.officeAddress || '',
          profileImage: updatedAgentData.profileImage || '',
        };
        setAgentInfo(updatedAgent);

        // Update Redux state
        dispatch(setAgentLogin({
          email: auth.email || '',
          phone: updatedAgentData.phone || '',
          first_name: updatedAgentData.firstName || '',
          last_name: updatedAgentData.lastName || '',
          profileImage: updatedAgentData.profileImage || '',
          id: auth.id || '',
          agentAccessToken: auth.agentAccessToken || '',
          role: auth.role || 'agent',
          agencyName: updatedAgentData.agencyName || '',
          licenseNumber: updatedAgentData.licenseNumber || '',
          officeAddress: updatedAgentData.officeAddress || ''
        }));

        // Update form to match new data
        setProfileForm({
          firstName: updatedAgentData.firstName || '',
          lastName: updatedAgentData.lastName || '',
          email: auth.email || '',
          phone: updatedAgentData.phone || '',
          agencyName: updatedAgentData.agencyName || '',
          licenseNumber: updatedAgentData.licenseNumber || '',
          officeAddress: updatedAgentData.officeAddress || ''
        });

        showModal('success', 'Success', 'Profile updated successfully!');
      } else {
        throw new Error(response.data?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile. Please try again.';
      showModal('error', 'Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Client-side validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showModal('error', 'Validation Error', 'All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showModal('error', 'Validation Error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showModal('error', 'Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // Call change password API
      const response = await agentAuthService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.data?.success) {
        showModal('success', 'Success', response.data.message || 'Password changed successfully!', () => {
          // Clear form after successful password change
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        });
      } else {
        throw new Error(response.data?.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to change password. Please try again.';
      showModal('error', 'Password Change Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // View booking details
  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  // Handle booking cancellation
  const handleCancelBooking = (booking) => {
    // Store booking for cancellation
    setSelectedBooking(booking);
    setShowCancellationModal(true);
  };

  // Confirm cancellation with reason
  const confirmCancellation = async () => {
    if (!selectedBooking || !cancellationReason.trim()) {
      showModal('error', 'Validation Error', 'Please provide a cancellation reason');
      return;
    }

    setLoading(true);
    try {
      const response = await bookingService.cancel(selectedBooking.id, {
        reason: cancellationReason.trim(),
        notes: cancellationNotes.trim() || ''
      });

      if (response.data?.success) {
        const { refund, paymentStatus, refundedAmount, refundEligibleAmount, refundPercentage } = response.data.data || {};
        let modalMessage = response.data.message || 'Booking cancelled successfully';

        // Add refund information if available
        if (refund && refund.eligibleAmount > 0 && refund.percentage > 0) {
          const refundAmount = typeof refundedAmount === 'number'
            ? refundedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })
            : (refundedAmount || refund.eligibleAmount || '0');
          const eligibleAmount = typeof refundEligibleAmount === 'number'
            ? refundEligibleAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })
            : (refundEligibleAmount || refund.eligibleAmount || '0');

          modalMessage += `\n\n💰 Refund Information:\n`;
          modalMessage += `• Refunded Amount: ₹${refundAmount}\n`;
          if (refundEligibleAmount && refundEligibleAmount !== refundedAmount) {
            modalMessage += `• Eligible Amount: ₹${eligibleAmount}\n`;
          }
          modalMessage += `• Refund Percentage: ${refundPercentage || refund.percentage}%\n`;
          modalMessage += `• Days Notice: ${refund.daysNotice || 'N/A'}\n`;
          modalMessage += `• Payment Status: ${formatPaymentStatus(paymentStatus)}`;
        } else if (refundedAmount && refundedAmount > 0) {
          const refundAmount = typeof refundedAmount === 'number'
            ? refundedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })
            : refundedAmount;
          modalMessage += `\n\n💰 Refund Information:\n`;
          modalMessage += `• Refunded Amount: ₹${refundAmount}\n`;
          if (refundPercentage) {
            modalMessage += `• Refund Percentage: ${refundPercentage}%\n`;
          }
          modalMessage += `• Payment Status: ${formatPaymentStatus(paymentStatus)}`;
        } else if (paymentStatus) {
          modalMessage += `\n\nPayment Status: ${formatPaymentStatus(paymentStatus)}`;
        }

        showModal('success', 'Booking Cancelled', modalMessage, () => {
          // Refresh bookings after successful cancellation (reset to page 1)
          setCurrentPage(1);
          fetchBookings(1);
          // Reset cancellation modal
          setShowCancellationModal(false);
          setCancellationReason('');
          setCancellationNotes('');
          setSelectedBooking(null);
        });
      } else {
        throw new Error(response.data?.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel booking. Please try again.';
      showModal('error', 'Cancellation Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Continue booking - navigate to agent routes
  const handleContinueBooking = () => {
    navigate('/app/agent/home');
    // Navigation happens immediately, no modal needed
  };

  // Check if booking can show cancellation request button
  const canShowCancellationRequest = (booking) => {
    if (!booking) return false;

    // Don't show for cancelled or completed bookings
    const status = booking.status?.toLowerCase();
    if (status === 'cancelled' || status === 'completed') return false;

    // Get check-in date from originalData or formatted checkIn
    const checkInDateStr = booking.checkIn || booking.originalData?.checkIn;
    if (!checkInDateStr) return false;

    // Create today's date at midnight UTC for consistent comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Parse check-in date - handle both ISO strings and date strings
    let checkInDate;
    if (typeof checkInDateStr === 'string') {
      // If it's already a date string (YYYY-MM-DD), parse it directly
      if (checkInDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        checkInDate = new Date(checkInDateStr + 'T00:00:00.000Z');
      } else {
        // Otherwise parse as ISO string
        checkInDate = new Date(checkInDateStr);
      }
    } else {
      checkInDate = new Date(checkInDateStr);
    }

    // Set to midnight UTC for comparison
    checkInDate.setUTCHours(0, 0, 0, 0);

    // Validate date
    if (isNaN(checkInDate.getTime())) return false;

    // Show button only if check-in is today or in the future
    // If check-in is in the past, guest has already checked in, so don't allow cancellation
    return checkInDate >= today;
  };

  const handleRequestCancellation = (booking) => {
    setCancellationRequestBooking(booking);
    setShowCancellationRequestModal(true);
  };

  const handleCancellationRequestSuccess = () => {
    // Refresh bookings after successful cancellation request
    setCurrentPage(1);
    fetchBookings(1);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const normalized = status.toLowerCase().replace(/_/g, '-');
    switch (normalized) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refund-initiated': return 'bg-blue-100 text-blue-800';
      case 'refund-completed': return 'bg-green-100 text-green-800';
      case 'refund-failed': return 'bg-red-100 text-red-800';
      case 'refund-not-applicable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPaymentStatus = (status) => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle view room details
  const handleViewRoomDetails = (booking) => {
    setSelectedBooking(booking);
    setShowRoomDetailsModal(true);
  };

  // Close room details modal
  const closeRoomDetailsModal = () => {
    setShowRoomDetailsModal(false);
    setSelectedBooking(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <DashboardHeader
        agentInfo={agentInfo}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Tab Navigation */}
        <DashboardTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Continue Booking Card */}
            <NewBookingCard
              handleContinueBooking={handleContinueBooking}
            />

            {/* Search and Filter */}
            <BookingFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              bookingFilter={bookingFilter}
              setBookingFilter={setBookingFilter}
            />

            {/* Bookings Display */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              {bookingsLoading && (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading bookings...</p>
                </div>
              )}

              {!bookingsLoading && bookingsError && (
                <div className="p-6 text-center">
                  <p className="text-sm text-red-600 mb-4">{bookingsError}</p>
                  <button
                    onClick={fetchBookings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Desktop Table View */}
              {!bookingsLoading && !bookingsError && (
                <BookingTable
                  bookings={filteredBookings}
                  loading={bookingsLoading}
                  error={bookingsError}
                  handleViewBooking={handleViewBooking}
                  handleRequestCancellation={handleRequestCancellation}
                  canShowCancellationRequest={canShowCancellationRequest}
                  handleViewRoomDetails={handleViewRoomDetails}
                  formatPaymentStatus={formatPaymentStatus}
                  getPaymentStatusColor={getPaymentStatusColor}
                  getStatusColor={getStatusColor}
                />
              )}

              {/* Mobile Card View */}
              {!bookingsLoading && !bookingsError && (
                <BookingMobileList
                  bookings={filteredBookings}
                  loading={bookingsLoading}
                  error={bookingsError}
                  handleViewBooking={handleViewBooking}
                  handleRequestCancellation={handleRequestCancellation}
                  canShowCancellationRequest={canShowCancellationRequest}
                  handleViewRoomDetails={handleViewRoomDetails}
                  formatPaymentStatus={formatPaymentStatus}
                  getPaymentStatusColor={getPaymentStatusColor}
                  getStatusColor={getStatusColor}
                />
              )}

              {/* Pagination Controls */}
              {!bookingsLoading && !bookingsError && (
                <PaginationControls
                  pagination={pagination}
                  currentPage={currentPage}
                  handlePageChange={handlePageChange}
                />
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <ProfileView
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            loading={loading}
            handleProfileUpdate={handleProfileUpdate}
            auth={auth}
          />
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <PasswordView
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            showPasswords={showPasswords}
            setShowPasswords={setShowPasswords}
            loading={loading}
            handlePasswordChange={handlePasswordChange}
          />
        )}
      </main>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={showBookingDetails}
        onClose={() => {
          setShowBookingDetails(false);
          setSelectedBooking(null);
        }}
        selectedBooking={selectedBooking}
        getStatusColor={getStatusColor}
        getPaymentStatusColor={getPaymentStatusColor}
        formatPaymentStatus={formatPaymentStatus}
      />

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setCancellationReason('');
          setCancellationNotes('');
          setSelectedBooking(null);
        }}
        selectedBooking={selectedBooking}
        cancellationReason={cancellationReason}
        setCancellationReason={setCancellationReason}
        cancellationNotes={cancellationNotes}
        setCancellationNotes={setCancellationNotes}
        loading={loading}
        confirmCancellation={confirmCancellation}
      />

      {/* Room Details Modal */}
      <RoomDetailsModal
        isOpen={showRoomDetailsModal}
        onClose={closeRoomDetailsModal}
        selectedBooking={selectedBooking}
      />

      {/* Notification Modal */}
      <GenericModal
        modal={modal}
        closeModal={closeModal}
      />

      {/* Cancellation Request Modal */}
      {showCancellationRequestModal && cancellationRequestBooking && (
        <CancellationRequestModal
          isOpen={showCancellationRequestModal}
          onClose={() => {
            setShowCancellationRequestModal(false);
            setCancellationRequestBooking(null);
          }}
          booking={cancellationRequestBooking}
          onSuccess={handleCancellationRequestSuccess}
          userContactNumber={cancellationRequestBooking?.originalData?.guest?.phone || cancellationRequestBooking?.customerPhone || auth?.phone || ''}
        />
      )}
    </div>
  );
};

export default AgentDashboard;
