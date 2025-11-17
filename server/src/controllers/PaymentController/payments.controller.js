const { PrismaClient, PaymentStatus } = require('@prisma/client');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { verifyPropertyAccess } = require('../adminController/propertyAccess.utils');
const prisma = new PrismaClient();

/**
 * Get all payments (Admin only - from all properties)
 */
const getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstname: true,
            lastname: true,
            isDeleted: true,
          },
        },
        agent: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            agencyName: true,
            isDeleted: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            isDeleted: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            isDeleted: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format payments for frontend (filter out deleted relations)
    const formattedPayments = payments.map((payment) => {
      const customer = payment.customer && !payment.customer.isDeleted ? payment.customer : null;
      const agent = payment.agent && !payment.agent.isDeleted ? payment.agent : null;
      const property = payment.property && !payment.property.isDeleted ? payment.property : null;
      const booking = payment.booking && !payment.booking.isDeleted ? payment.booking : null;

      // Determine customer/agent name and details
      let customerName = 'N/A';
      let customerEmail = 'N/A';
      let customerPhone = 'N/A';

      if (customer) {
        // Registered user
        customerName = `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email;
        customerEmail = customer.email || 'N/A';
        customerPhone = customer.phone || 'N/A';
      } else if (agent) {
        // Travel agent
        customerName = agent.agencyName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email;
        customerEmail = agent.email || 'N/A';
        customerPhone = agent.phone || 'N/A';
      } else if (payment.guestName || payment.guestEmail || payment.guestPhone) {
        // Guest/Frontdesk booking
        customerName = payment.guestName || 'N/A';
        customerEmail = payment.guestEmail || 'N/A';
        customerPhone = payment.guestPhone || 'N/A';
      } else if (booking) {
        // Fallback to booking guest info
        customerName = booking.guestName || 'N/A';
        customerEmail = booking.guestEmail || 'N/A';
        customerPhone = booking.guestPhone || 'N/A';
      }

      return {
        id: payment.id,
        transactionID: payment.transactionID,
        bookingNumber: booking?.bookingNumber || 'N/A',
        customerName,
        customerEmail,
        customerPhone,
        amount: parseFloat(payment.amount),
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        date: payment.date,
      };
    });

    return sendSuccess(res, formattedPayments, 'Payments retrieved successfully');
  } catch (error) {
    console.error('Error fetching all payments:', error);
    return sendError(res, 'Failed to fetch payments', 500);
  }
};

/**
 * Get payments for a specific property (Admin or Host)
 * Host can only see payments for their own properties
 */
const getPropertyPayments = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const user = req.user;

    // Verify property access (host can only access their own properties)
    const accessCheck = await verifyPropertyAccess({
      prisma,
      propertyId,
      user,
    });

    if (!accessCheck.ok) {
      return sendError(res, accessCheck.error.message, accessCheck.error.status);
    }

    const payments = await prisma.payment.findMany({
      where: {
        propertyId,
        isDeleted: false,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstname: true,
            lastname: true,
            isDeleted: true,
          },
        },
        agent: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            agencyName: true,
            isDeleted: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            isDeleted: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            isDeleted: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format payments for frontend (filter out deleted relations)
    const formattedPayments = payments.map((payment) => {
      const customer = payment.customer && !payment.customer.isDeleted ? payment.customer : null;
      const agent = payment.agent && !payment.agent.isDeleted ? payment.agent : null;
      const property = payment.property && !payment.property.isDeleted ? payment.property : null;
      const booking = payment.booking && !payment.booking.isDeleted ? payment.booking : null;

      // Determine customer/agent name and details
      let customerName = 'N/A';
      let customerEmail = 'N/A';
      let customerPhone = 'N/A';

      if (customer) {
        // Registered user
        customerName = `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email;
        customerEmail = customer.email || 'N/A';
        customerPhone = customer.phone || 'N/A';
      } else if (agent) {
        // Travel agent
        customerName = agent.agencyName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email;
        customerEmail = agent.email || 'N/A';
        customerPhone = agent.phone || 'N/A';
      } else if (payment.guestName || payment.guestEmail || payment.guestPhone) {
        // Guest/Frontdesk booking
        customerName = payment.guestName || 'N/A';
        customerEmail = payment.guestEmail || 'N/A';
        customerPhone = payment.guestPhone || 'N/A';
      } else if (booking) {
        // Fallback to booking guest info
        customerName = booking.guestName || 'N/A';
        customerEmail = booking.guestEmail || 'N/A';
        customerPhone = booking.guestPhone || 'N/A';
      }

      return {
        id: payment.id,
        transactionID: payment.transactionID,
        bookingNumber: booking?.bookingNumber || 'N/A',
        customerName,
        customerEmail,
        customerPhone,
        amount: parseFloat(payment.amount),
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        date: payment.date,
      };
    });

    return sendSuccess(res, formattedPayments, 'Property payments retrieved successfully');
  } catch (error) {
    console.error('Error fetching property payments:', error);
    return sendError(res, 'Failed to fetch property payments', 500);
  }
};

/**
 * Update payment status (Admin or Host)
 * Host can only update payments for their own properties
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;
    const user = req.user;

    // Validate status
    if (!status || !Object.values(PaymentStatus).includes(status)) {
      return sendError(
        res,
        `Invalid payment status. Must be one of: ${Object.values(PaymentStatus).join(', ')}`,
        400
      );
    }

    // Use transaction to ensure atomicity of payment and booking updates
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          id: paymentId,
          isDeleted: false,
        },
        select: {
          id: true,
          propertyId: true,
          bookingId: true,
          status: true, // Current payment status
        },
      });

      if (!payment) {
        return {
          status: 404,
          body: { success: false, message: 'Payment not found' },
        };
      }

      // Verify property access for host
      if (user?.role === 'host' && user?.id) {
        const accessCheck = await verifyPropertyAccess({
          prisma: tx,
          propertyId: payment.propertyId,
          user,
        });

        if (!accessCheck.ok) {
          return {
            status: accessCheck.error.status,
            body: { success: false, message: accessCheck.error.message },
          };
        }
      }

      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status,
        },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstname: true,
              lastname: true,
              isDeleted: true,
            },
          },
          agent: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              agencyName: true,
              isDeleted: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              isDeleted: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              guestName: true,
              guestEmail: true,
              guestPhone: true,
              paymentStatus: true, // Current booking payment status
              isDeleted: true,
            },
          },
        },
      });

      // Update booking paymentStatus if payment is linked to a booking
      if (updatedPayment.bookingId && updatedPayment.booking && !updatedPayment.booking.isDeleted) {
        // Determine if booking paymentStatus should be updated
        // Update booking paymentStatus for refund-related statuses
        const refundStatuses = [
          PaymentStatus.REFUND_INITIATED,
          PaymentStatus.REFUND_COMPLETED,
          PaymentStatus.REFUND_FAILED,
          PaymentStatus.REFUND_NOT_APPLICABLE,
        ];

        // Update booking paymentStatus if:
        // 1. Payment status is a refund status (always sync)
        // 2. Payment status is PAID and booking is PENDING (update to PAID)
        const shouldUpdateBooking = 
          refundStatuses.includes(status) ||
          (status === PaymentStatus.PAID && updatedPayment.booking.paymentStatus === PaymentStatus.PENDING);

        if (shouldUpdateBooking) {
          const now = new Date();
          
          // Update booking paymentStatus to match payment status
          await tx.booking.update({
            where: {
              id: updatedPayment.bookingId,
            },
            data: {
              paymentStatus: status,
              // Update refundStatusUpdatedAt if it's a refund status
              refundStatusUpdatedAt: refundStatuses.includes(status) ? now : undefined,
              updatedAt: now,
            },
          });
        }
      }

      return {
        status: 200,
        body: {
          success: true,
          message: 'Payment status updated successfully',
          data: updatedPayment,
        },
      };
    });

    // Handle transaction result
    if (result.status !== 200) {
      return res.status(result.status).json(result.body);
    }

    const updatedPayment = result.body.data;

    // Format payment for frontend (filter out deleted relations)
    const customer = updatedPayment.customer && !updatedPayment.customer.isDeleted ? updatedPayment.customer : null;
    const agent = updatedPayment.agent && !updatedPayment.agent.isDeleted ? updatedPayment.agent : null;
    const property = updatedPayment.property && !updatedPayment.property.isDeleted ? updatedPayment.property : null;
    const booking = updatedPayment.booking && !updatedPayment.booking.isDeleted ? updatedPayment.booking : null;

    // Determine customer/agent name and details
    let customerName = 'N/A';
    let customerEmail = 'N/A';
    let customerPhone = 'N/A';

    if (customer) {
      // Registered user
      customerName = `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email;
      customerEmail = customer.email || 'N/A';
      customerPhone = customer.phone || 'N/A';
    } else if (agent) {
      // Travel agent
      customerName = agent.agencyName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email;
      customerEmail = agent.email || 'N/A';
      customerPhone = agent.phone || 'N/A';
    } else if (updatedPayment.guestName || updatedPayment.guestEmail || updatedPayment.guestPhone) {
      // Guest/Frontdesk booking
      customerName = updatedPayment.guestName || 'N/A';
      customerEmail = updatedPayment.guestEmail || 'N/A';
      customerPhone = updatedPayment.guestPhone || 'N/A';
    } else if (booking) {
      // Fallback to booking guest info
      customerName = booking.guestName || 'N/A';
      customerEmail = booking.guestEmail || 'N/A';
      customerPhone = booking.guestPhone || 'N/A';
    }

    const formattedPayment = {
      id: updatedPayment.id,
      transactionID: updatedPayment.transactionID,
      bookingNumber: booking?.bookingNumber || 'N/A',
      customerName,
      customerEmail,
      customerPhone,
      amount: parseFloat(updatedPayment.amount),
      paymentMethod: updatedPayment.paymentMethod,
      status: updatedPayment.status,
      date: updatedPayment.date,
    };

    return sendSuccess(res, formattedPayment, 'Payment status updated successfully');
  } catch (error) {
    console.error('Error updating payment status:', error);
    return sendError(res, 'Failed to update payment status', 500);
  }
};

/**
 * Get all payment statuses from enum (for dropdown)
 */
const getPaymentStatuses = async (req, res) => {
  try {
    const statuses = Object.values(PaymentStatus);
    return sendSuccess(res, statuses, 'Payment statuses retrieved successfully');
  } catch (error) {
    console.error('Error fetching payment statuses:', error);
    return sendError(res, 'Failed to fetch payment statuses', 500);
  }
};

module.exports = {
  getAllPayments,
  getPropertyPayments,
  updatePaymentStatus,
  getPaymentStatuses,
};

