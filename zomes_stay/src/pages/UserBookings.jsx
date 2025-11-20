import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Calendar, Eye, X, XCircle, ChevronLeft, ChevronRight,
  Search, Building2, Users, AlertCircle, Star, Edit2, Trash2
} from 'lucide-react';
import bookingService from '../services/property/admin/booking/bookingService';
import CancellationRequestModal from '../components/shared/CancellationRequestModal';
import ReviewModal from '../components/shared/ReviewModal';
import reviewService from '../services/review/reviewService';

const UserBookings = () => {
  const navigate = useNavigate();
  const { id: userId, userAccessToken } = useSelector((state) => state.userAuth);
  
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'upcoming', 'past'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [showCancellationRequestModal, setShowCancellationRequestModal] = useState(false);
  const [cancellationRequestBooking, setCancellationRequestBooking] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [bookingReviews, setBookingReviews] = useState({}); // { bookingId: review }
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentPage, setCurrentPage] = useState(1);

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
      propertyName: booking.property?.title || booking.property?.name || 'N/A',
      propertyId: booking.property?.id || '',
      checkIn: booking.checkIn ? formatDate(booking.checkIn) : '',
      checkOut: booking.checkOut ? formatDate(booking.checkOut) : '',
      nights: booking.nights || 0,
      guests: booking.totalGuests || 0,
      amount: booking.totalAmount || 0,
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || null,
      roomSelections: booking.roomSelections || [],
      originalData: booking
    };
  };

  // Fetch bookings from API
  const fetchBookings = useCallback(async (page = currentPage) => {
    if (!userId) {
      setBookings([]);
      return;
    }

    setBookingsLoading(true);
    setBookingsError('');

    try {
      const params = {
        role: 'user',
        entityId: userId,
        page: page,
        limit: 10,
        search: searchQuery || undefined,
      };

      const response = await bookingService.list(params);
      
      if (response.data?.success) {
        const bookingsData = response.data.data || [];
        const paginationData = response.data.pagination || {};
        
        let mappedBookings = bookingsData.map(mapBookingData);
        
        // Apply client-side date filtering if needed (upcoming/past)
        if (bookingFilter === 'upcoming' || bookingFilter === 'past') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          mappedBookings = mappedBookings.filter(booking => {
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
    } finally {
      setBookingsLoading(false);
    }
  }, [userId, searchQuery, bookingFilter, currentPage]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userAccessToken || !userId) {
      navigate('/app/login');
    }
  }, [userAccessToken, userId, navigate]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    if (userAccessToken && userId) {
      setCurrentPage(1);
    }
  }, [searchQuery, bookingFilter, userAccessToken, userId]);

  // Fetch bookings when component mounts or when filters/search/page change
  useEffect(() => {
    if (userAccessToken && userId) {
      fetchBookings(currentPage);
    }
  }, [userAccessToken, userId, currentPage, fetchBookings]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // View booking details
  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
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

  // Check if booking can show cancellation request button
  const canShowCancellationRequest = (booking) => {
    if (!booking) return false;
    
    // Don't show for cancelled or completed bookings
    const status = booking.status?.toLowerCase();
    if (status === 'cancelled' || status === 'completed') return false;
    
    // Check if check-in date is today or in the future (not checked in yet)
    const checkInDateStr = booking.checkIn || booking.originalData?.checkIn;
    if (!checkInDateStr) return false;
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let checkInDate;
    if (typeof checkInDateStr === 'string' && checkInDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkInDate = new Date(checkInDateStr + 'T00:00:00.000Z');
    } else {
      checkInDate = new Date(checkInDateStr);
    }
    checkInDate.setUTCHours(0, 0, 0, 0);
    
    if (isNaN(checkInDate.getTime())) return false;
    
    // Show button if check-in is today or in the future
    return checkInDate >= today;
  };

  // Check if booking can show review button
  // Edge cases:
  // - Only show if booking status is 'completed'
  // - Can create review within 90 days of booking completion (check-out date)
  // - Can edit/delete review within 7 days of review creation
  const canShowReviewButton = (booking) => {
    if (!booking) return false;
    
    // Only show for completed bookings
    const status = booking.status?.toLowerCase();
    if (status !== 'completed') return false;
    
    // Get check-out date (booking completion date)
    const checkOutDateStr = booking.checkOut || booking.originalData?.checkOut;
    if (!checkOutDateStr) return false;
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let checkOutDate;
    if (typeof checkOutDateStr === 'string' && checkOutDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkOutDate = new Date(checkOutDateStr + 'T00:00:00.000Z');
    } else {
      checkOutDate = new Date(checkOutDateStr);
    }
    checkOutDate.setUTCHours(0, 0, 0, 0);
    
    if (isNaN(checkOutDate.getTime())) return false;
    
    // Calculate days since booking completion
    const diffTime = today.getTime() - checkOutDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Can create review within 90 days of booking completion
    return diffDays >= 0 && diffDays <= 90;
  };

  // Check if review can be edited/deleted (within 7 days of creation)
  const canEditDeleteReview = (review) => {
    if (!review || !review.createdAt) return false;
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const reviewDate = new Date(review.createdAt);
    reviewDate.setUTCHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - reviewDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Can edit/delete within 7 days of creation
    return diffDays >= 0 && diffDays <= 7;
  };

  // Fetch review for a booking
  const fetchReviewForBooking = useCallback(async (bookingId) => {
    if (!bookingId) return;
    
    try {
      const response = await reviewService.getByBooking(bookingId);
      if (response.data?.success && response.data.data?.review) {
        setBookingReviews((prev) => ({
          ...prev,
          [bookingId]: response.data.data.review,
        }));
      } else {
        // No review exists
        setBookingReviews((prev) => ({
          ...prev,
          [bookingId]: null,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch review:', err);
      // If error, assume no review exists
      setBookingReviews((prev) => ({
        ...prev,
        [bookingId]: null,
      }));
    }
  }, []);

  // Fetch reviews for all completed bookings
  useEffect(() => {
    if (bookings.length > 0) {
      bookings.forEach((booking) => {
        // Only fetch reviews for completed bookings
        if (booking.status?.toLowerCase() === 'completed') {
          // Check if within 90 days window
          const checkOutDateStr = booking.checkOut || booking.originalData?.checkOut;
          if (checkOutDateStr) {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            
            let checkOutDate;
            if (typeof checkOutDateStr === 'string' && checkOutDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              checkOutDate = new Date(checkOutDateStr + 'T00:00:00.000Z');
            } else {
              checkOutDate = new Date(checkOutDateStr);
            }
            checkOutDate.setUTCHours(0, 0, 0, 0);
            
            if (!isNaN(checkOutDate.getTime())) {
              const diffTime = today.getTime() - checkOutDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              // Only fetch if within 90 days window
              if (diffDays >= 0 && diffDays <= 90) {
                fetchReviewForBooking(booking.id);
              }
            }
          }
        }
      });
    }
  }, [bookings, fetchReviewForBooking]);

  const handleReviewClick = (booking) => {
    setReviewBooking(booking);
    setShowReviewModal(true);
  };

  const handleReviewSuccess = () => {
    // Refresh review for the booking
    if (reviewBooking?.id) {
      fetchReviewForBooking(reviewBooking.id);
    }
    // Refresh bookings list
    fetchBookings(currentPage);
  };

  const handleRequestCancellation = (booking) => {
    setCancellationRequestBooking(booking);
    setShowCancellationRequestModal(true);
  };

  const handleCancellationRequestSuccess = () => {
    // Refresh bookings after successful cancellation request
    fetchBookings(currentPage);
  };

  if (!userAccessToken || !userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">View and manage your bookings</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
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

        {/* Bookings Display */}
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
                onClick={() => fetchBookings(currentPage)}
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
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.bookingNumber || booking.id}
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewBooking(booking)}
                              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                              View
                            </button>
                            {canShowCancellationRequest(booking) && (
                              <button
                                onClick={() => handleRequestCancellation(booking)}
                                className="text-orange-600 hover:text-orange-800 font-medium transition-colors flex items-center gap-1 text-xs"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                Request Cancel
                              </button>
                            )}
                            {canShowReviewButton(booking) && (
                              <>
                                {bookingReviews[booking.id] ? (
                                  canEditDeleteReview(bookingReviews[booking.id]) ? (
                                    <button
                                      onClick={() => handleReviewClick(booking)}
                                      className="text-yellow-600 hover:text-yellow-800 font-medium transition-colors flex items-center gap-1 text-xs"
                                      title="Edit Review"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                      Edit Review
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                      <span>Reviewed</span>
                                    </div>
                                  )
                                ) : (
                                  <button
                                    onClick={() => handleReviewClick(booking)}
                                    className="text-yellow-600 hover:text-yellow-800 font-medium transition-colors flex items-center gap-1 text-xs"
                                    title="Write Review"
                                  >
                                    <Star className="h-3.5 w-3.5" />
                                    Write Review
                                  </button>
                                )}
                              </>
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

          {/* Mobile Card View */}
          {!bookingsLoading && !bookingsError && (
            <div className="md:hidden divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No bookings found
                </div>
              ) : (
                bookings.map((booking) => (
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
                        <p className="text-xs font-medium text-gray-900 truncate mb-0.5">{booking.propertyName}</p>
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
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewBooking(booking)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          View Details
                        </button>
                        {canShowCancellationRequest(booking) && (
                          <button
                            onClick={() => handleRequestCancellation(booking)}
                            className="flex-1 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            Request Cancel
                          </button>
                        )}
                      </div>
                      {canShowReviewButton(booking) && (
                        <div className="w-full">
                          {bookingReviews[booking.id] ? (
                            canEditDeleteReview(bookingReviews[booking.id]) ? (
                              <button
                                onClick={() => handleReviewClick(booking)}
                                className="w-full px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Review
                              </button>
                            ) : (
                              <div className="w-full px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-md text-xs font-medium flex items-center justify-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                Review Submitted
                              </div>
                            )
                          ) : (
                            <button
                              onClick={() => handleReviewClick(booking)}
                              className="w-full px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                            >
                              <Star className="h-3.5 w-3.5" />
                              Write Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {!bookingsLoading && !bookingsError && bookings.length > 0 && pagination.total > 0 && (
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

        {/* Booking Details Modal */}
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

      {/* Room Details Modal */}
      {showRoomDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto">
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
          userContactNumber={cancellationRequestBooking?.originalData?.guest?.phone || cancellationRequestBooking?.customerPhone || ''}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && reviewBooking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setReviewBooking(null);
          }}
          booking={reviewBooking}
          existingReview={bookingReviews[reviewBooking.id] || null}
          onSuccess={handleReviewSuccess}
        />
      )}
      </div>
    </div>
  );
};

export default UserBookings;

