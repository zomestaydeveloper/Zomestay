import apiService from '../../api/apiService';
import { AGENT_OPERATIONS } from '../../api/apiEndpoints';

const agentOperationsService = {
  // Get all active travel agents
  getActiveAgents: () => apiService.get(AGENT_OPERATIONS.AGENTS),

  // Admin: Get all agents (any status)
  getAllAgents: () => apiService.get(AGENT_OPERATIONS.ADMIN_AGENTS_LIST),

  // Get all active properties for agent discount management
  getActiveProperties: () => apiService.get(AGENT_OPERATIONS.PROPERTIES),

  // Get all agents with their property discounts (for admin)
  getAgentsWithDiscounts: () => apiService.get(AGENT_OPERATIONS.AGENTS_WITH_DISCOUNTS),

  // Get agent's discounts for all properties
  getAgentPropertyDiscounts: (agentId) => 
    apiService.get(`${AGENT_OPERATIONS.AGENT_DISCOUNTS}/${agentId}/discounts`),

  // Set discount for agent-property combination
  setAgentPropertyDiscount: (data) => 
    apiService.post(AGENT_OPERATIONS.SET_DISCOUNT, data),

  // Remove discount for agent-property combination
  removeAgentPropertyDiscount: (agentId, propertyId) => 
    apiService.delete(`${AGENT_OPERATIONS.REMOVE_DISCOUNT}/${agentId}/${propertyId}`),

  // Block/Unblock agent from property
  toggleAgentPropertyAccess: (agentId, propertyId, isBlocked) => 
    apiService.patch(`${AGENT_OPERATIONS.TOGGLE_ACCESS}/${agentId}/properties/${propertyId}/access`, { isBlocked })
  ,
  // Admin: Update agent status (approve/suspend/reject/pending)
  updateAgentStatus: (agentId, status, reason) => 
    apiService.patch(`${AGENT_OPERATIONS.ADMIN_UPDATE_STATUS}/${agentId}/status`, { status, reason })
  ,
  // Admin: Soft delete agent
  deleteAgent: (agentId, reason) =>
    apiService.delete(`${AGENT_OPERATIONS.ADMIN_DELETE_AGENT}/${agentId}`, { data: { reason } })
};

export default agentOperationsService;
