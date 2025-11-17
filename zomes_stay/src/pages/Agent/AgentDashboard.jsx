import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutAgent } from '../../store/agentAuthSlice';
import { persistor } from '../../store/store';
import { 
  Building2, Users, DollarSign, LogOut, CheckCircle, 
  Calendar, FileText, Settings, Eye, EyeOff, Save, X,
  Edit, CreditCard, MapPin, Phone, Mail, User, Lock,
  Search, Filter, AlertCircle, Info, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import agentAuthService from '../../services/auth/agent_authService';
import { setAgentLogin } from '../../store/agentAuthSlice';
import bookingService from '../../services/property/admin/booking/bookingService';

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
  const mapBookingData = (booking) => {
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
  };

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
  }, [auth?.id, searchQuery, bookingFilter, currentPage]);

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

  // Check if booking can be cancelled (not past and not already cancelled)
  const canCancelBooking = (booking) => {
    if (!booking) return false;
    
    // Don't show cancel for already cancelled bookings
    if (booking.status?.toLowerCase() === 'cancelled') return false;
    
    // Get check-out date from originalData or formatted checkOut
    const checkOutDateStr = booking.originalData?.checkOut || booking.checkOut;
    if (!checkOutDateStr) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOutDate = new Date(checkOutDateStr);
    checkOutDate.setHours(0, 0, 0, 0);
    
    // Show cancel button if check-out is today or in the future (upcoming or present)
    return checkOutDate >= today;
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
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                  Agent Portal
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {agentInfo?.firstName || agentInfo?.email || 'Agent'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Tab Navigation - Same for Mobile and Desktop */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${
                activeTab === 'bookings'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="text-xs sm:text-sm md:text-base">Bookings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <User className="h-4 w-4" />
                <span className="text-xs sm:text-sm md:text-base">Profile</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${
                activeTab === 'password'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <Lock className="h-4 w-4" />
                <span className="text-xs sm:text-sm md:text-base">Password</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Continue Booking Card - Mobile Optimized */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 md:mb-2">Start New Booking</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Browse properties and create bookings for your clients</p>
                </div>
                <button
                  onClick={handleContinueBooking}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-md sm:rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Continue Booking</span>
                </button>
              </div>
            </div>

            {/* Search and Filter - Mobile Optimized */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 border border-gray-200">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                {/* Booking Category Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setBookingFilter('all')}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      bookingFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Bookings
                  </button>
                  <button
                    onClick={() => setBookingFilter('upcoming')}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      bookingFilter === 'upcoming'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => setBookingFilter('past')}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      bookingFilter === 'past'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Past
                  </button>
                </div>
              </div>
            </div>

            {/* Bookings Display - Mobile Cards / Desktop Table */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              {/* Loading State */}
              {bookingsLoading && (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading bookings...</p>
                </div>
              )}

              {/* Error State */}
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
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking #</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Details</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                            No bookings found
                          </td>
                        </tr>
                      ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.bookingNumber || booking.id}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <div className="flex flex-col">
                              <span className="font-medium">{booking.customerName}</span>
                              <span className="text-xs text-gray-500">{booking.customerEmail}</span>
                              {booking.customerPhone && (
                                <span className="text-xs text-gray-500">{booking.customerPhone}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-700 max-w-[150px]">
                            <div className="truncate" title={booking.propertyName}>
                              {booking.propertyName}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-700">
                            {booking.roomSelections && booking.roomSelections.length > 0 ? (
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
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {booking.checkIn || '—'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {booking.checkOut || '—'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {booking.nights || '—'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {booking.guests || '—'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ₹{typeof booking.amount === 'number' ? booking.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (booking.amount ? String(booking.amount).replace(/,/g, '') : '0')}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                              {formatPaymentStatus(booking.paymentStatus)}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleViewBooking(booking)}
                                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                              >
                                View
                              </button>
                              {canCancelBooking(booking) && (
                                <button
                                  onClick={() => handleCancelBooking(booking)}
                                  className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 transition-colors"
                                  title="Cancel Booking"
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span>Cancel</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile Card View - Compact */}
              {!bookingsLoading && !bookingsError && (
                <div className="md:hidden divide-y divide-gray-200">
                  {filteredBookings.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No bookings found
                    </div>
                  ) : (
                  filteredBookings.map((booking) => (
                    <div key={booking.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center flex-wrap gap-1.5 mb-1">
                            <span className="text-xs font-semibold text-gray-900 truncate">{booking.bookingNumber || booking.id}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(booking.status)} whitespace-nowrap`}>
                              {booking.status}
                            </span>
                            {booking.paymentStatus && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStatusColor(booking.paymentStatus)} whitespace-nowrap`}>
                                {formatPaymentStatus(booking.paymentStatus)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-900 truncate mb-0.5">{booking.customerName}</p>
                          <p className="text-xs text-gray-600 truncate">{booking.propertyName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-semibold text-gray-900">₹{typeof booking.amount === 'number' ? booking.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : booking.amount || '0'}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{booking.checkIn || '—'}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{booking.checkOut || '—'}</span>
                        </div>
                        <div className="flex items-center">
                          <Building2 className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          {booking.roomSelections && booking.roomSelections.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleViewRoomDetails(booking)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-[11px]"
                            >
                              {booking.roomSelections.length} Room Type{booking.roomSelections.length !== 1 ? 's' : ''}
                            </button>
                          ) : (
                            <span className="truncate text-[11px]">—</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span>{booking.guests || 0} guests</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewBooking(booking)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          View Details
                        </button>
                        {canCancelBooking(booking) && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {!bookingsLoading && !bookingsError && filteredBookings.length > 0 && pagination.total > 0 && (
                <div className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6 flex items-center justify-between">
                  <div className="flex-1 flex items-center justify-between sm:hidden">
                    {pagination.pages > 1 ? (
                      <>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!pagination.hasPrev}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-700">
                          Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!pagination.hasNext}
                          className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-700">
                        Showing {pagination.total} {pagination.total === 1 ? 'booking' : 'bookings'}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                        <span className="font-medium">{pagination.total}</span> results
                      </p>
                    </div>
                    {pagination.pages > 1 && (
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={!pagination.hasPrev}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          
                          {/* Page Numbers */}
                          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                            let pageNum;
                            if (pagination.pages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= pagination.pages - 2) {
                              pageNum = pagination.pages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNum
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={!pagination.hasNext}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Edit Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-gray-100"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Agency Name
                </label>
                <input
                  type="text"
                  value={profileForm.agencyName}
                  onChange={(e) => setProfileForm({ ...profileForm, agencyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  License Number
                </label>
                <input
                  type="text"
                  value={profileForm.licenseNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Office Address
                </label>
                <textarea
                  value={profileForm.officeAddress}
                  onChange={(e) => setProfileForm({ ...profileForm, officeAddress: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  // Reset form to current Redux agentAuth state
                  setProfileForm({
                    firstName: auth.first_name || '',
                    lastName: auth.last_name || '',
                    email: auth.email || '',
                    phone: auth.phone || '',
                    agencyName: auth.agencyName || '',
                    licenseNumber: auth.licenseNumber || '',
                    officeAddress: auth.officeAddress || ''
                  });
                }}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileUpdate}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 text-sm sm:text-base"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Change Password</h2>
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 text-sm sm:text-base font-medium"
                >
                  <Lock className="h-4 w-4" />
                  <span>{loading ? 'Changing Password...' : 'Change Password'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Booking Details Modal - Mobile Optimized */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => {
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Booking Number</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.bookingNumber || selectedBooking.id}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Name</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.customerName}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Email</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.customerEmail || '—'}</p>
                </div>
                {selectedBooking.customerPhone && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Phone</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.customerPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Property</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.propertyName}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Check-in</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.checkIn || '—'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Check-out</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.checkOut || '—'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Nights</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.nights || '—'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Guests</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.guests || '—'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="font-semibold text-gray-900 text-base sm:text-lg">₹{typeof selectedBooking.amount === 'number' ? selectedBooking.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (selectedBooking.amount ? String(selectedBooking.amount).replace(/,/g, '') : '0')}</p>
                </div>
                {selectedBooking.paymentStatus && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Payment Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>
                      {formatPaymentStatus(selectedBooking.paymentStatus)}
                    </span>
                  </div>
                )}
              </div>

              {/* Room Selections Section */}
              {selectedBooking.roomSelections && selectedBooking.roomSelections.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Room Details</h4>
                  <div className="space-y-3">
                    {selectedBooking.roomSelections.map((selection, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="text-base font-semibold text-gray-900">
                              {selection.roomType || 'Room Type'}
                            </h5>
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
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex justify-end">
              <button
                onClick={() => {
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                }}
                className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancellationModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-900 flex-1">
                    Cancel Booking
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCancellationModal(false);
                    setCancellationReason('');
                    setCancellationNotes('');
                    setSelectedBooking(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 ml-2 flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    Booking ID: <span className="font-semibold">{selectedBooking.id}</span>
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    Property: <span className="font-semibold">{selectedBooking.propertyName}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Customer: <span className="font-semibold">{selectedBooking.customerName}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please provide a reason for cancellation..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={cancellationNotes}
                    onChange={(e) => setCancellationNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCancellationModal(false);
                    setCancellationReason('');
                    setCancellationNotes('');
                    setSelectedBooking(null);
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCancellation}
                  disabled={loading || !cancellationReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
                  Booking: {selectedBooking.bookingNumber || selectedBooking.id}
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

      {/* Notification Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3 flex-1">
                  {modal.type === 'success' && (
                    <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  )}
                  {modal.type === 'error' && (
                    <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  )}
                  {modal.type === 'info' && (
                    <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                      <Info className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <h3 className={`text-lg font-semibold flex-1 ${
                    modal.type === 'success' ? 'text-green-900' :
                    modal.type === 'error' ? 'text-red-900' :
                    'text-blue-900'
                  }`}>
                    {modal.title}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-1 ml-2 flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="mb-6">
                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">
                  {modal.message}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    modal.type === 'success' 
                      ? 'bg-green-600 text-white hover:bg-green-700' :
                    modal.type === 'error'
                      ? 'bg-red-600 text-white hover:bg-red-700' :
                      'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;
