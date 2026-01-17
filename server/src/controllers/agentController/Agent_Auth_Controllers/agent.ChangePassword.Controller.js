/**
 * Change Travel Agent Password
 * Requires authenticated travel agent
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

module.exports = async function changeTravelAgentPassword(req, res) {
  try {
    const agentId = req.user?.agentId;

    // 1. Authorization check
    if (!agentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // 2. Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // 3. Fetch agent
    const travelAgent = await prisma.travelAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        password: true
      }
    });

    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: 'Travel agent not found'
      });
    }

    // 4. Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      travelAgent.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // 5. Prevent password reuse
    const isSamePassword = await bcrypt.compare(
      newPassword,
      travelAgent.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from the current password'
      });
    }

    // 6. Hash & update
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.travelAgent.update({
      where: { id: agentId },
      data: { password: hashedPassword }
    });

    // 7. Response
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change Travel Agent Password Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
};
