/**
 * Cancellation Request Controller
 * Handles cancellation request creation, retrieval, approval, and rejection
 * Users, Agents, and Hosts can create cancellation requests
 * Admin can approve/reject cancellation requests
 */

const { PrismaClient, BookingStatus } = require('@prisma/client');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { smsService, emailService, smsTemplates, emailTemplates } = require('../../services/communication');

const prisma = new PrismaClient();

// Default cancellation reasons
const DEFAULT_REASONS = [
  'Travel plans changed',
  'Emergency/Medical issue',
  'Found better deal',
  'Property issues',
  'Personal reasons',
  'Weather concerns',
  'Other'
];

/**
 * Ensure user is authenticated and extract role/ID
 */
const ensureAuthenticated = (req) => {
  const role = req.user?.role;
  const id = req.user?.id;

  if (!id || !role) {
    return {
      ok: false,
      status: 401,
      message: 'Authentication required. Please login to continue.',
    };
  }

  // Only allow user, agent, or host roles
  if (!['user', 'agent', 'host'].includes(role)) {
    return {
      ok: false,
      status: 403,
      message: 'Only users, agents, and hosts can create cancellation requests.',
    };
  }

  return { ok: true, role, id };
};

/**
 * Ensure admin is authenticated
 */
const ensureAdminAccess = (req) => {
  const role = req.user?.role;
  const id = req.user?.id;

  if (!id || !role) {
    return {
      ok: false,
      status: 401,
      message: 'Authentication required. Please login to continue.',
    };
  }

  if (role !== 'admin') {
    return {
      ok: false,
      status: 403,
      message: 'Only admins can perform this action.',
    };
  }

  return { ok: true, adminId: id };
};

/**
 * Validate phone number format (basic validation)
 */
const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces, dashes, and plus signs for validation
  const cleaned = phone.replace(/[\s\-+]/g, '');
  // Should have at least 10 digits
  return /^\d{10,15}$/.test(cleaned);
};

/**
 * Fetch requester contact information based on role
 * @param {string} role - 'user', 'agent', or 'host'
 * @param {string} requestedBy - Requester ID
 * @param {object} booking - Booking object (for fallback)
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<object>} { name, email, phone }
 */
const fetchRequesterContactInfo = async (role, requestedBy, booking, tx = prisma) => {
  const contactInfo = {
    name: booking?.guestName || 'Guest',
    email: booking?.guestEmail || null,
    phone: booking?.guestPhone || null,
  };

  try {
    if (role === 'user' && requestedBy) {
      const user = await tx.user.findUnique({
        where: { id: requestedBy, isDeleted: false },
        select: { email: true, phone: true, firstname: true, lastname: true }
      });
      if (user) {
        contactInfo.email = user.email || contactInfo.email;
        contactInfo.phone = user.phone || contactInfo.phone;
        if (user.firstname) {
          contactInfo.name = `${user.firstname}${user.lastname ? ' ' + user.lastname : ''}`;
        }
      }
    } else if (role === 'agent' && requestedBy) {
      const agent = await tx.travelAgent.findUnique({
        where: { id: requestedBy, isDeleted: false },
        select: { email: true, phone: true, firstName: true, lastName: true }
      });
      if (agent) {
        contactInfo.email = agent.email || contactInfo.email;
        contactInfo.phone = agent.phone || contactInfo.phone;
        if (agent.firstName) {
          contactInfo.name = `${agent.firstName}${agent.lastName ? ' ' + agent.lastName : ''}`;
        }
      }
    } else if (role === 'host' && requestedBy) {
      const host = await tx.host.findUnique({
        where: { id: requestedBy, isDeleted: false },
        select: { email: true, phone: true, firstName: true, lastName: true }
      });
      if (host) {
        contactInfo.email = host.email || contactInfo.email;
        contactInfo.phone = host.phone || contactInfo.phone;
        if (host.firstName) {
          contactInfo.name = `${host.firstName}${host.lastName ? ' ' + host.lastName : ''}`;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching requester contact info:', error.message);
  }

  return contactInfo;
};

/**
 * Fetch host contact information
 * @param {string} propertyId - Property ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<object>} { name, email }
 */
const fetchHostContactInfo = async (propertyId, tx = prisma) => {
  try {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: {
        ownerHostId: true,
        host: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (property?.host) {
      return {
        name: `${property.host.firstName || ''} ${property.host.lastName || ''}`.trim() || 'Property Owner',
        email: property.host.email
      };
    }
  } catch (error) {
    console.error('Error fetching host contact info:', error.message);
  }

  return { name: null, email: null };
};

/**
 * Fetch all active admin emails
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<Array<string>>} Array of admin emails
 */
const fetchActiveAdminEmails = async (tx = prisma) => {
  try {
    const admins = await tx.admin.findMany({
      where: {
        status: 'ACTIVE',
        isDeleted: false
      },
      select: { email: true }
    });
    return admins.map(admin => admin.email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching active admin emails:', error.message);
    return [];
  }
};

/**
 * Send notifications when cancellation request is created
 * @param {object} cancellationRequest - Cancellation request object
 * @param {object} requesterContact - Requester contact info
 * @param {Array<string>} adminEmails - Array of admin emails
 */
const sendRequestCreatedNotifications = async (cancellationRequest, requesterContact, adminEmails) => {
  try {
    const booking = cancellationRequest.booking;
    const requestData = {
      guestName: requesterContact.name,
      bookingNumber: booking.bookingNumber,
      propertyName: booking.property?.title || 'Property',
      checkIn: booking.startDate,
      checkOut: booking.endDate,
      requestId: cancellationRequest.id,
      reason: cancellationRequest.reason
    };

    // 1. Send to Requester (SMS + Email)
    if (requesterContact.phone && requesterContact.email) {
      try {
        const smsMessage = smsTemplates.cancellationRequestSubmitted({
          guestName: requesterContact.name,
          bookingNumber: booking.bookingNumber,
          requestId: cancellationRequest.id
        });

        const emailHTML = emailTemplates.cancellationRequestSubmitted(requestData);

        const smsProvider = process.env.SMS_PROVIDER || 'mock';
        const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
          ? process.env.TWILIO_PHONE_NUMBER 
          : 'ZOMESSTAY';

        await smsService.send({
          to: requesterContact.phone,
          message: smsMessage,
          from: smsFrom
        });

        await emailService.send({
          to: requesterContact.email,
          subject: 'Cancellation Request Received - ZomesStay',
          content: emailHTML
        });
      } catch (error) {
        console.error('Failed to send requester notifications:', error.message);
      }
    }

    // 2. Send to All Admins (Email only)
    if (adminEmails.length > 0) {
      try {
        const adminEmailHTML = emailTemplates.adminCancellationRequestNotification({
          bookingNumber: booking.bookingNumber,
          propertyName: booking.property?.title || 'Property',
          requesterName: requesterContact.name,
          requesterRole: cancellationRequest.role,
          requesterEmail: requesterContact.email,
          requesterPhone: requesterContact.phone || cancellationRequest.contactNumber,
          checkIn: booking.startDate,
          checkOut: booking.endDate,
          reason: cancellationRequest.reason,
          customReason: cancellationRequest.customReason,
          requestId: cancellationRequest.id
        });

        await Promise.all(
          adminEmails.map(adminEmail =>
            emailService.send({
              to: adminEmail,
              subject: 'New Cancellation Request - ZomesStay',
              content: adminEmailHTML
            })
          )
        );
      } catch (error) {
        console.error('Failed to send admin notifications:', error.message);
      }
    }
  } catch (error) {
    console.error('Error sending request created notifications:', error.message);
  }
};

/**
 * Send notifications when cancellation request is approved
 * @param {object} cancellationRequest - Cancellation request object
 * @param {object} booking - Booking object
 * @param {object} requesterContact - Requester contact info
 * @param {object} hostContact - Host contact info
 */
const sendRequestApprovedNotifications = async (cancellationRequest, booking, requesterContact, hostContact) => {
  try {
    const refundAmount = booking.totalAmount; // Full refund for now
    const refundTimeline = '5-7 business days';

    const approvalData = {
      guestName: requesterContact.name,
      bookingNumber: booking.bookingNumber,
      propertyName: booking.property?.title || 'Property',
      refundAmount: refundAmount,
      refundTimeline: refundTimeline
    };

    // 1. Send to Requester (SMS + Email)
    if (requesterContact.phone && requesterContact.email) {
      try {
        const smsMessage = smsTemplates.cancellationApproved({
          guestName: requesterContact.name,
          bookingNumber: booking.bookingNumber,
          refundAmount: refundAmount,
          refundTimeline: refundTimeline
        });

        const emailHTML = emailTemplates.cancellationApproved(approvalData);

        const smsProvider = process.env.SMS_PROVIDER || 'mock';
        const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
          ? process.env.TWILIO_PHONE_NUMBER 
          : 'ZOMESSTAY';

        await smsService.send({
          to: requesterContact.phone,
          message: smsMessage,
          from: smsFrom
        });

        await emailService.send({
          to: requesterContact.email,
          subject: 'Cancellation Approved - ZomesStay',
          content: emailHTML
        });
      } catch (error) {
        console.error('Failed to send requester approval notifications:', error.message);
      }
    }

    // 2. Send to Host (Email only)
    if (hostContact.email) {
      try {
        const hostEmailHTML = emailTemplates.hostBookingCancellationNotification({
          hostName: hostContact.name,
          bookingNumber: booking.bookingNumber,
          propertyName: booking.property?.title || 'Property',
          guestName: booking.guestName || requesterContact.name,
          guestEmail: booking.guestEmail || requesterContact.email,
          guestPhone: booking.guestPhone || requesterContact.phone,
          checkIn: booking.startDate,
          checkOut: booking.endDate,
          nights: booking.nights || 0,
          guests: booking.adults || 0,
          children: booking.children || 0,
          totalAmount: booking.totalAmount,
          refundAmount: refundAmount
        });

        await emailService.send({
          to: hostContact.email,
          subject: 'Booking Cancelled - ZomesStay',
          content: hostEmailHTML
        });
      } catch (error) {
        console.error('Failed to send host cancellation notification:', error.message);
      }
    }
  } catch (error) {
    console.error('Error sending request approved notifications:', error.message);
  }
};

/**
 * Send notifications when cancellation request is rejected
 * @param {object} cancellationRequest - Cancellation request object
 * @param {object} booking - Booking object
 * @param {object} requesterContact - Requester contact info
 */
const sendRequestRejectedNotifications = async (cancellationRequest, booking, requesterContact) => {
  try {
    const rejectionData = {
      guestName: requesterContact.name,
      bookingNumber: booking.bookingNumber,
      propertyName: booking.property?.title || 'Property',
      adminNotes: cancellationRequest.adminNotes
    };

    // Send to Requester (SMS + Email)
    if (requesterContact.phone && requesterContact.email) {
      try {
        const smsMessage = smsTemplates.cancellationRejected({
          guestName: requesterContact.name,
          bookingNumber: booking.bookingNumber,
          adminNotes: cancellationRequest.adminNotes
        });

        const emailHTML = emailTemplates.cancellationRejected(rejectionData);

        const smsProvider = process.env.SMS_PROVIDER || 'mock';
        const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
          ? process.env.TWILIO_PHONE_NUMBER 
          : 'ZOMESSTAY';

        await smsService.send({
          to: requesterContact.phone,
          message: smsMessage,
          from: smsFrom
        });

        await emailService.send({
          to: requesterContact.email,
          subject: 'Cancellation Request Declined - ZomesStay',
          content: emailHTML
        });
      } catch (error) {
        console.error('Failed to send requester rejection notifications:', error.message);
      }
    }
  } catch (error) {
    console.error('Error sending request rejected notifications:', error.message);
  }
};

/**
 * Create a cancellation request
 * POST /api/cancellation-requests
 * Body: { bookingId, reason, customReason?, contactNumber }
 * Access: User, Agent, Host
 */
const createCancellationRequest = async (req, res) => {
  try {
    // Check authentication
    const authCheck = ensureAuthenticated(req);
    if (!authCheck.ok) {
      return sendError(res, authCheck.message, authCheck.status);
    }
    const { role, id: requestedBy } = authCheck;

    const { bookingId, reason, customReason, contactNumber } = req.body;

    // Validation
    if (!bookingId) {
      return sendError(res, 'Booking ID is required', 400);
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return sendError(res, 'Reason is required', 400);
    }

    if (reason.length > 500) {
      return sendError(res, 'Reason cannot exceed 500 characters', 400);
    }

    if (customReason && typeof customReason !== 'string') {
      return sendError(res, 'Custom reason must be a string', 400);
    }

    if (customReason && customReason.length > 1000) {
      return sendError(res, 'Custom reason cannot exceed 1000 characters', 400);
    }

    if (!contactNumber) {
      return sendError(res, 'Contact number is required', 400);
    }

    if (!isValidPhoneNumber(contactNumber)) {
      return sendError(res, 'Invalid contact number format', 400);
    }

    // Validate booking exists and belongs to requester
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        isDeleted: false,
        ...(role === 'user' && { userId: requestedBy }),
        ...(role === 'agent' && { agentId: requestedBy }),
        // For host, check if booking belongs to their property
        ...(role === 'host' && {
          property: {
            ownerHostId: requestedBy,
          },
        }),
      },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              ownerHostId: true,
            },
          },
        },
    });

    if (!booking) {
      return sendError(
        res,
        'Booking not found or you do not have permission to cancel this booking',
        404
      );
    }

    // Check if booking is already cancelled
    if (booking.status === BookingStatus.cancelled) {
      return sendError(res, 'Booking is already cancelled', 400);
    }

    // Check if there's already a pending request for this booking
    const existingRequest = await prisma.cancellationRequest.findFirst({
      where: {
        bookingId,
        status: 'pending',
        isDeleted: false,
      },
    });

    if (existingRequest) {
      return sendError(
        res,
        'A pending cancellation request already exists for this booking',
        400
      );
    }

    // Create cancellation request
    const cancellationRequest = await prisma.cancellationRequest.create({
      data: {
        bookingId,
        requestedBy,
        role,
        reason: reason.trim(),
        customReason: customReason ? customReason.trim() : null,
        contactNumber: contactNumber.trim(),
        status: 'pending',
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            startDate: true,
            endDate: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Send notifications (non-blocking)
    try {
      const requesterContact = await fetchRequesterContactInfo(role, requestedBy, cancellationRequest.booking);
      const adminEmails = await fetchActiveAdminEmails();
      
      sendRequestCreatedNotifications(cancellationRequest, requesterContact, adminEmails)
        .catch(error => {
          console.error('Failed to send cancellation request notifications (non-critical):', error.message);
        });
    } catch (error) {
      console.error('Error preparing cancellation request notifications (non-critical):', error.message);
    }

    return sendSuccess(
      res,
      {
        cancellationRequest: {
          id: cancellationRequest.id,
          bookingId: cancellationRequest.bookingId,
          bookingNumber: cancellationRequest.booking.bookingNumber,
          reason: cancellationRequest.reason,
          customReason: cancellationRequest.customReason,
          contactNumber: cancellationRequest.contactNumber,
          status: cancellationRequest.status,
          createdAt: cancellationRequest.createdAt,
        },
      },
      'Cancellation request submitted successfully. Admin will review your request.',
      201
    );
  } catch (error) {
    console.error('Error creating cancellation request:', error);
    return sendError(
      res,
      'Failed to create cancellation request',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

/**
 * Get cancellation requests (for admin)
 * GET /api/cancellation-requests
 * Query params: status?, page?, limit?
 * Access: Admin only
 */
const getCancellationRequests = async (req, res) => {
  try {
    // Check admin access
    const adminCheck = ensureAdminAccess(req);
    if (!adminCheck.ok) {
      return sendError(res, adminCheck.message, adminCheck.status);
    }

    const { status, page = 1, limit = 20 } = req.query;

    // Validate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return sendError(res, 'Invalid page number', 400);
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return sendError(res, 'Limit must be between 1 and 100', 400);
    }

    // Build where clause
    const where = {
      isDeleted: false,
      ...(status && { status }),
    };

    // Get total count
    const total = await prisma.cancellationRequest.count({ where });

    // Get cancellation requests
    const cancellationRequests = await prisma.cancellationRequest.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            startDate: true,
            endDate: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const pages = Math.ceil(total / limitNum);

    return sendSuccess(
      res,
      {
        cancellationRequests: cancellationRequests.map((req) => ({
          id: req.id,
          bookingId: req.bookingId,
          bookingNumber: req.booking.bookingNumber,
          requestedBy: req.requestedBy,
          role: req.role,
          reason: req.reason,
          customReason: req.customReason,
          contactNumber: req.contactNumber,
          status: req.status,
          adminNotes: req.adminNotes,
          reviewedAt: req.reviewedAt,
          reviewedBy: req.reviewedBy,
          reviewer: req.admin
            ? {
                id: req.admin.id,
                name: `${req.admin.firstName} ${req.admin.lastName}`,
                email: req.admin.email,
              }
            : null,
          booking: {
            id: req.booking.id,
            bookingNumber: req.booking.bookingNumber,
            status: req.booking.status,
            totalAmount: req.booking.totalAmount,
            startDate: req.booking.startDate,
            endDate: req.booking.endDate,
            guestName: req.booking.guestName,
            guestEmail: req.booking.guestEmail,
            guestPhone: req.booking.guestPhone,
            property: req.booking.property,
          },
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasNext: pageNum < pages,
          hasPrev: pageNum > 1,
        },
      },
      'Cancellation requests retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching cancellation requests:', error);
    return sendError(
      res,
      'Failed to fetch cancellation requests',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

/**
 * Get own cancellation requests
 * GET /api/cancellation-requests/my-requests
 * Query params: status?, page?, limit?
 * Access: User, Agent, Host
 */
const getMyCancellationRequests = async (req, res) => {
  try {
    // Check authentication
    const authCheck = ensureAuthenticated(req);
    if (!authCheck.ok) {
      return sendError(res, authCheck.message, authCheck.status);
    }
    const { role, id: requestedBy } = authCheck;

    const { status, page = 1, limit = 20 } = req.query;

    // Validate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return sendError(res, 'Invalid page number', 400);
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return sendError(res, 'Limit must be between 1 and 100', 400);
    }

    // Build where clause
    const where = {
      requestedBy,
      role,
      isDeleted: false,
      ...(status && { status }),
    };

    // Get total count
    const total = await prisma.cancellationRequest.count({ where });

    // Get cancellation requests
    const cancellationRequests = await prisma.cancellationRequest.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            startDate: true,
            endDate: true,
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const pages = Math.ceil(total / limitNum);

    return sendSuccess(
      res,
      {
        cancellationRequests: cancellationRequests.map((req) => ({
          id: req.id,
          bookingId: req.bookingId,
          bookingNumber: req.booking.bookingNumber,
          reason: req.reason,
          customReason: req.customReason,
          contactNumber: req.contactNumber,
          status: req.status,
          adminNotes: req.adminNotes,
          reviewedAt: req.reviewedAt,
          booking: {
            id: req.booking.id,
            bookingNumber: req.booking.bookingNumber,
            status: req.booking.status,
            totalAmount: req.booking.totalAmount,
            startDate: req.booking.startDate,
            endDate: req.booking.endDate,
            property: req.booking.property,
          },
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasNext: pageNum < pages,
          hasPrev: pageNum > 1,
        },
      },
      'Cancellation requests retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching cancellation requests:', error);
    return sendError(
      res,
      'Failed to fetch cancellation requests',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

/**
 * Get default cancellation reasons
 * GET /api/cancellation-requests/reasons
 * Access: Public (no auth required)
 */
const getCancellationReasons = async (req, res) => {
  try {
    return sendSuccess(
      res,
      {
        reasons: DEFAULT_REASONS,
      },
      'Cancellation reasons retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching cancellation reasons:', error);
    return sendError(
      res,
      'Failed to fetch cancellation reasons',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

/**
 * Approve cancellation request (admin only)
 * PUT /api/cancellation-requests/:requestId/approve
 * Body: { adminNotes? }
 * Access: Admin only
 */
const approveCancellationRequest = async (req, res) => {
  try {
    // Check admin access
    const adminCheck = ensureAdminAccess(req);
    if (!adminCheck.ok) {
      return sendError(res, adminCheck.message, adminCheck.status);
    }
    const { adminId } = adminCheck;

    const { requestId } = req.params;
    const { adminNotes } = req.body;

    if (!requestId) {
      return sendError(res, 'Request ID is required', 400);
    }

    // Find cancellation request
    const cancellationRequest = await prisma.cancellationRequest.findFirst({
      where: {
        id: requestId,
        isDeleted: false,
      },
      include: {
        booking: {
          include: {
            cancellationPolicy: {
              include: {
                rules: true,
              },
            },
          },
        },
      },
    });

    if (!cancellationRequest) {
      return sendError(res, 'Cancellation request not found', 404);
    }

    if (cancellationRequest.status !== 'pending') {
      return sendError(
        res,
        `Cancellation request is already ${cancellationRequest.status}`,
        400
      );
    }

    // Check if booking is still cancellable
    if (cancellationRequest.booking.status === BookingStatus.cancelled) {
      return sendError(res, 'Booking is already cancelled', 400);
    }

    // Use transaction to update request and cancel booking
    const result = await prisma.$transaction(async (tx) => {
      // Update cancellation request status
      const updatedRequest = await tx.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          adminNotes: adminNotes ? adminNotes.trim() : null,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
        include: {
          booking: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  ownerHostId: true,
                },
              },
            },
          },
        },
      });

      // Cancel the booking (this will trigger refund calculation if needed)
      // Note: We'll use the existing cancellation logic from bookingCancellation.controller.js
      // For now, we'll just update the status
      await tx.booking.update({
        where: { id: cancellationRequest.bookingId },
        data: {
          status: BookingStatus.cancelled,
          cancellationDate: new Date(),
          cancellationReason: cancellationRequest.reason,
        },
      });

      return updatedRequest;
    });

    // Send notifications (non-blocking)
    try {
      const requesterContact = await fetchRequesterContactInfo(
        cancellationRequest.role,
        cancellationRequest.requestedBy,
        result.booking
      );
      const hostContact = await fetchHostContactInfo(result.booking.property.id);
      
      sendRequestApprovedNotifications(result, result.booking, requesterContact, hostContact)
        .catch(error => {
          console.error('Failed to send cancellation approval notifications (non-critical):', error.message);
        });
    } catch (error) {
      console.error('Error preparing cancellation approval notifications (non-critical):', error.message);
    }

    return sendSuccess(
      res,
      {
        cancellationRequest: {
          id: result.id,
          bookingId: result.bookingId,
          bookingNumber: result.booking.bookingNumber,
          status: result.status,
          adminNotes: result.adminNotes,
          reviewedAt: result.reviewedAt,
        },
      },
      'Cancellation request approved and booking cancelled successfully'
    );
  } catch (error) {
    console.error('Error approving cancellation request:', error);
    return sendError(
      res,
      'Failed to approve cancellation request',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

/**
 * Reject cancellation request (admin only)
 * PUT /api/cancellation-requests/:requestId/reject
 * Body: { adminNotes }
 * Access: Admin only
 */
const rejectCancellationRequest = async (req, res) => {
  try {
    // Check admin access
    const adminCheck = ensureAdminAccess(req);
    if (!adminCheck.ok) {
      return sendError(res, adminCheck.message, adminCheck.status);
    }
    const { adminId } = adminCheck;

    const { requestId } = req.params;
    const { adminNotes } = req.body;

    if (!requestId) {
      return sendError(res, 'Request ID is required', 400);
    }

    if (!adminNotes || typeof adminNotes !== 'string' || adminNotes.trim().length === 0) {
      return sendError(res, 'Admin notes are required when rejecting a request', 400);
    }

    if (adminNotes.length > 1000) {
      return sendError(res, 'Admin notes cannot exceed 1000 characters', 400);
    }

    // Find cancellation request
    const cancellationRequest = await prisma.cancellationRequest.findFirst({
      where: {
        id: requestId,
        isDeleted: false,
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
          },
        },
      },
    });

    if (!cancellationRequest) {
      return sendError(res, 'Cancellation request not found', 404);
    }

    if (cancellationRequest.status !== 'pending') {
      return sendError(
        res,
        `Cancellation request is already ${cancellationRequest.status}`,
        400
      );
    }

    // Update cancellation request status
    const updatedRequest = await prisma.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        adminNotes: adminNotes.trim(),
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Send notifications (non-blocking)
    try {
      const requesterContact = await fetchRequesterContactInfo(
        cancellationRequest.role,
        cancellationRequest.requestedBy,
        updatedRequest.booking
      );
      
      sendRequestRejectedNotifications(updatedRequest, updatedRequest.booking, requesterContact)
        .catch(error => {
          console.error('Failed to send cancellation rejection notifications (non-critical):', error.message);
        });
    } catch (error) {
      console.error('Error preparing cancellation rejection notifications (non-critical):', error.message);
    }

    return sendSuccess(
      res,
      {
        cancellationRequest: {
          id: updatedRequest.id,
          bookingId: updatedRequest.bookingId,
          bookingNumber: updatedRequest.booking.bookingNumber,
          status: updatedRequest.status,
          adminNotes: updatedRequest.adminNotes,
          reviewedAt: updatedRequest.reviewedAt,
        },
      },
      'Cancellation request rejected successfully'
    );
  } catch (error) {
    console.error('Error rejecting cancellation request:', error);
    return sendError(
      res,
      'Failed to reject cancellation request',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

/**
 * Get cancellation request by ID
 * GET /api/cancellation-requests/:requestId
 * Access: Admin, or requester (user/agent/host)
 */
const getCancellationRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return sendError(res, 'Request ID is required', 400);
    }

    // Find cancellation request
    const cancellationRequest = await prisma.cancellationRequest.findFirst({
      where: {
        id: requestId,
        isDeleted: false,
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            startDate: true,
            endDate: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!cancellationRequest) {
      return sendError(res, 'Cancellation request not found', 404);
    }

    // Check access: Admin can see all, requester can see their own
    const role = req.user?.role;
    const id = req.user?.id;

    if (role !== 'admin' && cancellationRequest.requestedBy !== id) {
      return sendError(res, 'You do not have permission to view this request', 403);
    }

    return sendSuccess(
      res,
      {
        cancellationRequest: {
          id: cancellationRequest.id,
          bookingId: cancellationRequest.bookingId,
          bookingNumber: cancellationRequest.booking.bookingNumber,
          requestedBy: cancellationRequest.requestedBy,
          role: cancellationRequest.role,
          reason: cancellationRequest.reason,
          customReason: cancellationRequest.customReason,
          contactNumber: cancellationRequest.contactNumber,
          status: cancellationRequest.status,
          adminNotes: cancellationRequest.adminNotes,
          reviewedAt: cancellationRequest.reviewedAt,
          reviewedBy: cancellationRequest.reviewedBy,
          reviewer: cancellationRequest.admin
            ? {
                id: cancellationRequest.admin.id,
                name: `${cancellationRequest.admin.firstName} ${cancellationRequest.admin.lastName}`,
                email: cancellationRequest.admin.email,
              }
            : null,
          booking: cancellationRequest.booking,
          createdAt: cancellationRequest.createdAt,
          updatedAt: cancellationRequest.updatedAt,
        },
      },
      'Cancellation request retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching cancellation request:', error);
    return sendError(
      res,
      'Failed to fetch cancellation request',
      500,
      process.env.NODE_ENV === 'development' ? error : null
    );
  }
};

module.exports = {
  createCancellationRequest,
  getCancellationRequests,
  getMyCancellationRequests,
  getCancellationReasons,
  approveCancellationRequest,
  rejectCancellationRequest,
  getCancellationRequestById,
};

