/**
 * Review Controller
 * Handles review creation, retrieval, update, and deletion
 * Only users (not agents/hosts/admins) can create reviews
 * Reviews can only be created for completed bookings
 */

const { PrismaClient, BookingStatus } = require('@prisma/client');
const { sendSuccess, sendError } = require('../../utils/response.utils');

const prisma = new PrismaClient();

// Constants
const REVIEW_EDIT_WINDOW_DAYS = 7; // Can edit review within 7 days of creation
const REVIEW_TIME_WINDOW_DAYS = 90; // Can create review within 90 days of booking completion

/**
 * Check if user is authenticated and is a regular user (not agent/host/admin)
 */
const ensureUserAccess = (req) => {
  const userRole = req.user?.role;
  const userId = req.user?.id;

  if (!userId || !userRole) {
    return {
      ok: false,
      status: 401,
      message: 'Authentication required. Please login to continue.',
    };
  }

  if (userRole !== 'user') {
    return {
      ok: false,
      status: 403,
      message: 'Only registered users can create reviews. Agents, hosts, and admins cannot create reviews.',
    };
  }

  return { ok: true, userId };
};

/**
 * Check if date is within time window
 */
const isWithinTimeWindow = (date, days) => {
  if (!date) return false;
  const checkDate = date instanceof Date ? date : new Date(date);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  checkDate.setUTCHours(0, 0, 0, 0);
  const diffTime = today.getTime() - checkDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
};

/**
 * Create a review for a completed booking
 * POST /api/reviews
 * Body: { bookingId, rating, description? }
 */
const createReview = async (req, res) => {
  try {
    // Check user access
    const accessCheck = ensureUserAccess(req);
    if (!accessCheck.ok) {
      return sendError(res, accessCheck.message, accessCheck.status);
    }
    const userId = accessCheck.userId;

    const { bookingId, rating, description } = req.body;

    // Validation
    if (!bookingId) {
      return sendError(res, 'Booking ID is required', 400);
    }

    if (!rating || typeof rating !== 'number') {
      return sendError(res, 'Rating is required and must be a number', 400);
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return sendError(res, 'Rating must be an integer between 1 and 5', 400);
    }

    if (description && typeof description !== 'string') {
      return sendError(res, 'Description must be a string', 400);
    }

    if (description && description.length > 1000) {
      return sendError(res, 'Description cannot exceed 1000 characters', 400);
    }

    // Validate booking exists and belongs to user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        status: true,
        endDate: true,
        propertyId: true,
      },
    });

    if (!booking) {
      return sendError(res, 'Booking not found or you do not have permission to review this booking', 404);
    }

    // Check booking status is completed
    if (booking.status !== BookingStatus.completed) {
      return sendError(res, `Cannot review booking with status '${booking.status}'. Only completed bookings can be reviewed.`, 400);
    }

    // Check if review already exists for this booking
    const existingReview = await prisma.review.findFirst({
      where: {
        bookingId,
        isDeleted: false,
      },
    });

    if (existingReview) {
      return sendError(res, 'Review already exists for this booking. You can edit or delete your existing review.', 409);
    }

    // Check time window (90 days after booking completion)
    if (!isWithinTimeWindow(booking.endDate, REVIEW_TIME_WINDOW_DAYS)) {
      return sendError(res, `Review period has expired. Reviews can only be created within ${REVIEW_TIME_WINDOW_DAYS} days of booking completion.`, 400);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        userId,
        propertyId: booking.propertyId,
        rating,
        description: description?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            profileImage: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    // Update property average rating and review count
    await updatePropertyRatingStats(booking.propertyId);

    return sendSuccess(
      res,
      {
        id: review.id,
        bookingId: review.bookingId,
        propertyId: review.propertyId,
        rating: review.rating,
        description: review.description,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        user: {
          id: review.user.id,
          name: `${review.user.firstname || ''} ${review.user.lastname || ''}`.trim() || 'Anonymous',
          profileImage: review.user.profileImage,
        },
        property: {
          id: review.property.id,
          title: review.property.title,
        },
        booking: {
          id: review.booking.id,
          bookingNumber: review.booking.bookingNumber,
          startDate: review.booking.startDate,
          endDate: review.booking.endDate,
        },
      },
      'Review created successfully',
      201
    );
  } catch (error) {
    console.error('Create review error:', error);
    return sendError(
      res,
      'Failed to create review',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

/**
 * Get reviews for a property
 * GET /api/reviews/property/:propertyId
 */
const getPropertyReviews = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!propertyId) {
      return sendError(res, 'Property ID is required', 400);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10))); // Max 50 per page
    const skip = (pageNum - 1) * limitNum;

    // Get reviews
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          propertyId,
          isDeleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              profileImage: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.review.count({
        where: {
          propertyId,
          isDeleted: false,
        },
      }),
    ]);

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      description: review.description,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        id: review.user.id,
        name: `${review.user.firstname || ''} ${review.user.lastname || ''}`.trim() || 'Anonymous',
        profileImage: review.user.profileImage,
      },
      booking: {
        id: review.booking.id,
        bookingNumber: review.booking.bookingNumber,
        startDate: review.booking.startDate,
        endDate: review.booking.endDate,
      },
    }));

    return sendSuccess(
      res,
      {
        reviews: formattedReviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Reviews fetched successfully'
    );
  } catch (error) {
    console.error('Get property reviews error:', error);
    return sendError(
      res,
      'Failed to fetch reviews',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

/**
 * Get review for a specific booking (to check if review exists)
 * GET /api/reviews/booking/:bookingId
 */
const getReviewForBooking = async (req, res) => {
  try {
    // Check user access
    const accessCheck = ensureUserAccess(req);
    if (!accessCheck.ok) {
      return sendError(res, accessCheck.message, accessCheck.status);
    }
    const userId = accessCheck.userId;

    const { bookingId } = req.params;

    if (!bookingId) {
      return sendError(res, 'Booking ID is required', 400);
    }

    // Verify booking belongs to user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        status: true,
        endDate: true,
      },
    });

    if (!booking) {
      return sendError(res, 'Booking not found or you do not have permission to view this booking', 404);
    }

    // Get review if exists
    const review = await prisma.review.findFirst({
      where: {
        bookingId,
        isDeleted: false,
      },
      select: {
        id: true,
        rating: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Check if review can be edited (within 7 days)
    let canEdit = false;
    if (review) {
      canEdit = isWithinTimeWindow(review.createdAt, REVIEW_EDIT_WINDOW_DAYS);
    }

    // Check if review can be created (booking completed and within time window)
    const canCreate = booking.status === BookingStatus.completed && 
                     isWithinTimeWindow(booking.endDate, REVIEW_TIME_WINDOW_DAYS);

    return sendSuccess(
      res,
      {
        review: review || null,
        canEdit,
        canCreate: !review && canCreate,
        canDelete: !!review,
        bookingStatus: booking.status,
      },
      review ? 'Review found' : 'No review found for this booking'
    );
  } catch (error) {
    console.error('Get review for booking error:', error);
    return sendError(
      res,
      'Failed to fetch review',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

/**
 * Update own review
 * PUT /api/reviews/:reviewId
 * Body: { rating?, description? }
 */
const updateReview = async (req, res) => {
  try {
    // Check user access
    const accessCheck = ensureUserAccess(req);
    if (!accessCheck.ok) {
      return sendError(res, accessCheck.message, accessCheck.status);
    }
    const userId = accessCheck.userId;

    const { reviewId } = req.params;
    const { rating, description } = req.body;

    if (!reviewId) {
      return sendError(res, 'Review ID is required', 400);
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (typeof rating !== 'number') {
        return sendError(res, 'Rating must be a number', 400);
      }
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return sendError(res, 'Rating must be an integer between 1 and 5', 400);
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      if (typeof description !== 'string') {
        return sendError(res, 'Description must be a string', 400);
      }
      if (description.length > 1000) {
        return sendError(res, 'Description cannot exceed 1000 characters', 400);
      }
    }

    // Check if at least one field is being updated
    if (rating === undefined && description === undefined) {
      return sendError(res, 'At least one field (rating or description) must be provided for update', 400);
    }

    // Get review and verify ownership
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        userId,
        isDeleted: false,
      },
      include: {
        property: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!review) {
      return sendError(res, 'Review not found or you do not have permission to update this review', 404);
    }

    // Check edit time window (7 days)
    if (!isWithinTimeWindow(review.createdAt, REVIEW_EDIT_WINDOW_DAYS)) {
      return sendError(
        res,
        `Review can only be edited within ${REVIEW_EDIT_WINDOW_DAYS} days of creation. Edit period has expired.`,
        400
      );
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: {
        id: reviewId,
      },
      data: {
        ...(rating !== undefined && { rating }),
        ...(description !== undefined && { description: description.trim() || null }),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            profileImage: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    // Update property average rating and review count
    await updatePropertyRatingStats(updatedReview.propertyId);

    return sendSuccess(
      res,
      {
        id: updatedReview.id,
        bookingId: updatedReview.bookingId,
        propertyId: updatedReview.propertyId,
        rating: updatedReview.rating,
        description: updatedReview.description,
        createdAt: updatedReview.createdAt,
        updatedAt: updatedReview.updatedAt,
        user: {
          id: updatedReview.user.id,
          name: `${updatedReview.user.firstname || ''} ${updatedReview.user.lastname || ''}`.trim() || 'Anonymous',
          profileImage: updatedReview.user.profileImage,
        },
        property: {
          id: updatedReview.property.id,
          title: updatedReview.property.title,
        },
        booking: {
          id: updatedReview.booking.id,
          bookingNumber: updatedReview.booking.bookingNumber,
          startDate: updatedReview.booking.startDate,
          endDate: updatedReview.booking.endDate,
        },
      },
      'Review updated successfully'
    );
  } catch (error) {
    console.error('Update review error:', error);
    return sendError(
      res,
      'Failed to update review',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

/**
 * Delete own review
 * DELETE /api/reviews/:reviewId
 */
const deleteReview = async (req, res) => {
  try {
    // Check user access
    const accessCheck = ensureUserAccess(req);
    if (!accessCheck.ok) {
      return sendError(res, accessCheck.message, accessCheck.status);
    }
    const userId = accessCheck.userId;

    const { reviewId } = req.params;

    if (!reviewId) {
      return sendError(res, 'Review ID is required', 400);
    }

    // Get review and verify ownership
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        propertyId: true,
        createdAt: true,
      },
    });

    if (!review) {
      return sendError(res, 'Review not found or you do not have permission to delete this review', 404);
    }

    // Check delete time window (7 days)
    if (!isWithinTimeWindow(review.createdAt, REVIEW_EDIT_WINDOW_DAYS)) {
      return sendError(
        res,
        `Review can only be deleted within ${REVIEW_EDIT_WINDOW_DAYS} days of creation. Delete period has expired.`,
        400
      );
    }

    // Hard delete review (permanently remove from database)
    await prisma.review.delete({
      where: {
        id: reviewId,
      },
    });

    // Update property average rating and review count
    await updatePropertyRatingStats(review.propertyId);

    return sendSuccess(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    return sendError(
      res,
      'Failed to delete review',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

/**
 * Update property rating statistics (avgRating and reviewCount)
 * Called after create/update/delete review
 */
const updatePropertyRatingStats = async (propertyId) => {
  try {
    const stats = await prisma.review.aggregate({
      where: {
        propertyId,
        isDeleted: false,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const avgRating = stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : null;
    const reviewCount = stats._count.id || 0;

    await prisma.property.update({
      where: {
        id: propertyId,
      },
      data: {
        avgRating: avgRating,
        reviewCount,
      },
    });
  } catch (error) {
    console.error('Error updating property rating stats:', error);
    // Don't throw - this is a background update, shouldn't fail the main operation
  }
};

module.exports = {
  createReview,
  getPropertyReviews,
  getReviewForBooking,
  updateReview,
  deleteReview,
};

