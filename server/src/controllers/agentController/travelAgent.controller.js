const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TravelAgentController = {
  // Get all approved active travel agents
  getActiveAgents: async (req, res) => {
    try {
      const agents = await prisma.travelAgent.findMany({
        where: {
          isDeleted: false,
          status: 'approved' // Only approved agents
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          agencyName: true,
          status: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform data to match frontend expectations
      const transformedAgents = agents.map(agent => ({
        id: agent.id,
        name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unknown',
        email: agent.email,
        phone: agent.phone,
        agencyName: agent.agencyName,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }));

      res.json({
        success: true,
        data: transformedAgents,
        count: transformedAgents.length
      });
    } catch (err) {
      console.error('getActiveAgents:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching active travel agents'
      });
    }
  }
  ,
  // Admin: Get all agents (any status)
  getAllAgents: async (req, res) => {
    try {
      const agents = await prisma.travelAgent.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          agencyName: true,
          licenseNumber: true,
          iataCertificate: true,
          officeAddress: true,
          status: true,
          rejectionReason: true,
          suspensionReason: true,
          totalBookings: true,
          approvalDate: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const transformed = agents.map(a => ({
        id: a.id,
        name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Unknown',
        email: a.email,
        phone: a.phone,
        agencyName: a.agencyName,
        licenseNumber: a.licenseNumber || null,
        iataCertificate: a.iataCertificate || null,
        officeAddress: a.officeAddress || null,
        status: a.status,
        rejectionReason: a.rejectionReason || null,
        suspensionReason: a.suspensionReason || null,
        totalBookings: a.totalBookings || 0,
        approvedAt: a.approvalDate || null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }));

      res.json({ success: true, data: transformed, count: transformed.length });
    } catch (err) {
      console.error('getAllAgents:', err);
      res.status(500).json({ success: false, message: 'Error fetching agents' });
    }
  }
  ,
  // Admin: Update agent status (approve, suspend, reject). Reason required for suspend/reject
  updateAgentStatus: async (req, res) => {
    try {
      const { agentId } = req.params;
      const { status, reason } = req.body;

      const allowed = ['approved', 'suspended', 'rejected', 'pending'];
      if (!agentId || !status || !allowed.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid agentId or status' });
      }

      // Require reason for suspended/rejected
      if ((status === 'suspended' || status === 'rejected') && (!reason || String(reason).trim().length === 0)) {
        return res.status(400).json({ success: false, message: 'Reason is required for suspend/reject' });
      }

      const exist = await prisma.travelAgent.findFirst({ where: { id: agentId, isDeleted: false } });
      if (!exist) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const data = {
        status,
        approvalDate: status === 'approved' ? new Date() : exist.approvalDate,
        updatedAt: new Date()
      };

      if (status === 'rejected') {
        data.rejectionReason = reason || null;
        data.suspensionReason = null;
      } else if (status === 'suspended') {
        data.suspensionReason = reason || null;
        data.rejectionReason = null;
      } else if (status === 'approved' || status === 'pending') {
        data.rejectionReason = null;
        data.suspensionReason = null;
      }

      const updated = await prisma.travelAgent.update({
        where: { id: agentId },
        data
      });

      res.json({ success: true, message: 'Agent status updated', data: { id: updated.id, status: updated.status } });
    } catch (err) {
      console.error('updateAgentStatus:', err);
      res.status(500).json({ success: false, message: 'Error updating agent status' });
    }
  }
  ,
  // Admin: Soft delete agent
  softDeleteAgent: async (req, res) => {
    try {
      const { agentId } = req.params;
      const { reason } = req.body || {};

      if (!agentId) {
        return res.status(400).json({ success: false, message: 'Missing agentId' });
      }

      const exist = await prisma.travelAgent.findFirst({ where: { id: agentId, isDeleted: false } });
      if (!exist) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const updated = await prisma.travelAgent.update({
        where: { id: agentId },
        data: {
          isDeleted: true,
          rejectionReason: reason || exist.rejectionReason || null,
          updatedAt: new Date()
        }
      });

      return res.json({ success: true, message: 'Agent deleted successfully', data: { id: updated.id } });
    } catch (err) {
      console.error('softDeleteAgent:', err);
      return res.status(500).json({ success: false, message: 'Error deleting agent' });
    }
  }
};

module.exports = TravelAgentController;
