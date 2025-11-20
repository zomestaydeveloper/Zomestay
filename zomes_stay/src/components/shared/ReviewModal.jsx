import React, { useState, useEffect } from 'react';
import { X, Star, Loader2, CheckCircle2, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import reviewService from '../../services/review/reviewService';

/**
 * Review Modal Component
 * Modern UI for creating, editing, and deleting reviews
 */
const ReviewModal = ({
  isOpen,
  onClose,
  booking,
  existingReview = null, // If provided, edit mode
  onSuccess,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [description, setDescription] = useState(existingReview?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isEditMode = !!existingReview;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        setRating(existingReview.rating || 0);
        setDescription(existingReview.description || '');
      } else {
        setRating(0);
        setDescription('');
      }
      setError('');
      setShowDeleteConfirm(false);
      setShowSuccessModal(false);
      setShowErrorModal(false);
    }
  }, [isOpen, existingReview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (rating < 1 || rating > 5) {
      setError('Please select a rating');
      return;
    }

    if (description && description.length > 1000) {
      setError('Description cannot exceed 1000 characters');
      return;
    }

    if (!booking?.id) {
      setError('Invalid booking information');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isEditMode) {
        // Update existing review
        response = await reviewService.update(existingReview.id, {
          rating,
          description: description.trim() || null,
        });
      } else {
        // Create new review
        response = await reviewService.create({
          bookingId: booking.id,
          rating,
          description: description.trim() || null,
        });
      }

      if (response.data?.success) {
        setSuccessMessage(
          response.data.message ||
          (isEditMode
            ? 'Review updated successfully!'
            : 'Review submitted successfully!')
        );
        setShowSuccessModal(true);
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        setErrorMessage(response.data?.message || 'Failed to submit review');
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to submit review. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview?.id) return;

    setDeleting(true);
    try {
      const response = await reviewService.delete(existingReview.id);

      if (response.data?.success) {
        setSuccessMessage('Review deleted successfully!');
        setShowSuccessModal(true);
        if (onSuccess) {
          onSuccess(null); // Pass null to indicate deletion
        }
      } else {
        setErrorMessage(response.data?.message || 'Failed to delete review');
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete review. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={loading}
            className="focus:outline-none transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium text-gray-700">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Review Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3 flex-1">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Star className="h-6 w-6 fill-white text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {isEditMode ? 'Edit Your Review' : 'Write a Review'}
                </h3>
                <p className="text-sm text-blue-100 mt-0.5">
                  {booking?.propertyName || 'Property'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading || deleting}
              className="text-white/90 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Booking Info Card */}
            <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Booking #{booking?.bookingNumber || booking?.id || 'N/A'}
                  </p>
                  {booking?.checkOut && (
                    <p className="text-xs text-gray-600 mt-1">
                      Completed on{' '}
                      {new Date(booking.checkOut).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting || loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 flex-1">{error}</p>
              </div>
            )}

            {/* Rating Section */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Your Rating <span className="text-red-500">*</span>
              </label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                {renderStars()}
              </div>
            </div>

            {/* Description Section */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Your Review (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your experience... What did you like? What could be improved?"
                rows={6}
                disabled={loading || deleting}
                maxLength={1000}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  Help others make better decisions
                </p>
                <p className="text-xs text-gray-500">
                  {description.length}/1000 characters
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || deleting}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || deleting || rating < 1}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isEditMode ? 'Updating...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <Edit2 className="h-4 w-4" />
                        <span>Update Review</span>
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 fill-white" />
                        <span>Submit Review</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Review?
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-6">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900">
                  Success!
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-6">{successMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900">Error</h3>
              </div>
              <p className="text-sm text-gray-700 mb-6">{errorMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewModal;

