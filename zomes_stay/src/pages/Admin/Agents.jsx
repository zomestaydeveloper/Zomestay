import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Percent, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Save,
  X,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Target,
  Eye,
  Ban,
  IndianRupee,
  Loader2
} from 'lucide-react';
import NotificationModal from '../../components/NotificationModal';
import { agentOperationsService } from '../../services';

const Agents = () => {
  // State management
  const [agents, setAgents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [agentRates, setAgentRates] = useState({}); // {agentId: {propertyId: {type: 'percentage'|'flat', value: number}}}
  const [blockedAgents, setBlockedAgents] = useState({}); // {agentId: [propertyIds]}
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  
  // Notification state
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch agents with discounts
      const agentsResponse = await agentOperationsService.getAgentsWithDiscounts();
      if (agentsResponse.data.success) {
        setAgents(agentsResponse.data.data);
        
        // Transform agent rates data from API response
        const ratesData = {};
        const blockedData = {};
        
        agentsResponse.data.data.forEach(agent => {
          if (agent.propertyDiscounts && agent.propertyDiscounts.length > 0) {
            ratesData[agent.id] = {};
            agent.propertyDiscounts.forEach(discount => {
              if (discount.isActive) {
                ratesData[agent.id][discount.propertyId] = {
                  type: discount.discountType,
                  value: discount.discountValue
                };
              } else {
                // If not active, it's blocked
                if (!blockedData[agent.id]) {
                  blockedData[agent.id] = [];
                }
                blockedData[agent.id].push(discount.propertyId);
              }
            });
          }
        });
        
        setAgentRates(ratesData);
        setBlockedAgents(blockedData);
      }

      // Fetch properties
      const propertiesResponse = await agentOperationsService.getActiveProperties();
      if (propertiesResponse.data.success) {
        setProperties(propertiesResponse.data.data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const getAgentRates = (agentId) => {
    return agentRates[agentId] || {};
  };

  const getPropertyDiscount = (agentId, propertyId) => {
    return getAgentRates(agentId)[propertyId] || null;
  };

  const isAgentBlocked = (agentId, propertyId) => {
    return blockedAgents[agentId]?.includes(propertyId) || false;
  };

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setShowPropertyModal(true);
  };

  const handleDiscountEdit = (agentId, propertyId) => {
    setEditingProperty({ agentId, propertyId });
    // Prefill when editing
    const existing = getPropertyDiscount(agentId, propertyId);
    setDiscountType(existing?.type || 'percentage');
    setDiscountValue(existing?.value !== undefined && existing?.value !== null ? String(existing.value) : '');
    setShowDiscountModal(true);
  };

  const handleDiscountDelete = async (agentId, propertyId) => {
    try {
      setLoading(true);
      
      const response = await agentOperationsService.removeAgentPropertyDiscount(agentId, propertyId);
      
      if (response.data.success) {
        // Update local state
        setAgentRates(prev => {
          const newRates = { ...prev };
          if (newRates[agentId]?.[propertyId]) {
            delete newRates[agentId][propertyId];
            // Clean up empty objects
            if (Object.keys(newRates[agentId]).length === 0) {
              delete newRates[agentId];
            }
          }
          return newRates;
        });
        
        showNotification('success', 'Discount Removed', 'Property discount removed successfully');
      } else {
        showNotification('error', 'Error', response.data.message || 'Failed to remove discount');
      }
    } catch (error) {
      console.error('Error removing discount:', error);
      showNotification('error', 'Error', 'Failed to remove discount. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async (agentId, propertyId) => {
    try {
      setLoading(true);
      
      const isCurrentlyBlocked = blockedAgents[agentId]?.includes(propertyId);
      const response = await agentOperationsService.toggleAgentPropertyAccess(agentId, propertyId, !isCurrentlyBlocked);
      
      if (response.data.success) {
        // Update local state
        setBlockedAgents(prev => {
          const newBlocked = { ...prev };
          if (newBlocked[agentId]?.includes(propertyId)) {
            // Unblock
            newBlocked[agentId] = newBlocked[agentId].filter(id => id !== propertyId);
            if (newBlocked[agentId].length === 0) {
              delete newBlocked[agentId];
            }
          } else {
            // Block
            newBlocked[agentId] = [...(newBlocked[agentId] || []), propertyId];
          }
          return newBlocked;
        });
        
        showNotification('success', 'Status Updated', `Agent ${isCurrentlyBlocked ? 'unblocked from' : 'blocked from'} property`);
      } else {
        showNotification('error', 'Error', response.data.message || 'Failed to update agent access');
      }
    } catch (error) {
      console.error('Error toggling agent access:', error);
      showNotification('error', 'Error', 'Failed to update agent access. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountSave = async (type, value) => {
    if (type === 'percentage' && (value < 0 || value > 100)) {
      showNotification('error', 'Invalid Percentage', 'Percentage must be between 0 and 100%');
      return;
    }
    if (type === 'flat' && value < 0) {
      showNotification('error', 'Invalid Amount', 'Flat amount must be positive');
      return;
    }

    try {
      setLoading(true);
      
      const response = await agentOperationsService.setAgentPropertyDiscount({
        agentId: editingProperty.agentId,
        propertyId: editingProperty.propertyId,
        discountType: type,
        discountValue: value
      });

      if (response.data.success) {
        // Update local state
        setAgentRates(prev => ({
          ...prev,
          [editingProperty.agentId]: {
            ...prev[editingProperty.agentId],
            [editingProperty.propertyId]: { type, value }
          }
        }));

        showNotification('success', 'Discount Updated', `Property discount set to ${type === 'percentage' ? value + '%' : '₹' + value}`);
        setShowDiscountModal(false);
        setEditingProperty(null);
      } else {
        showNotification('error', 'Error', response.data.message || 'Failed to save discount');
      }
    } catch (error) {
      console.error('Error saving discount:', error);
      showNotification('error', 'Error', 'Failed to save discount. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Travel Agents</h1>
              <p className="text-sm text-gray-500">Manage agent rates and property assignments</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Agents</p>
                <p className="text-2xl font-semibold text-gray-900">{agents.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Closed Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {agents.reduce((sum, agent) => sum + agent.closedBookings, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg. Bookings/Agent</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(agents.reduce((sum, agent) => sum + agent.closedBookings, 0) / agents.length)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Travel Agents</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-gray-600">Loading agents...</span>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Properties
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closed Bookings
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleAgentClick(agent)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                          <div className="text-sm text-gray-500">ID: {agent.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{agent.email}</div>
                      <div className="text-sm text-gray-500">{agent.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        agent.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Object.keys(getAgentRates(agent.id)).length} assigned
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">{agent.closedBookings}</span>
                        <span className="text-gray-500 text-xs">bookings</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAgentClick(agent);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Manage Rates
                      </button>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Property Modal */}
      {showPropertyModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedAgent.name} - Property Rates
                  </h2>
                  <p className="text-xs text-gray-500">Manage discounts and access</p>
                </div>
                <button
                  onClick={() => setShowPropertyModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[85vh]">
              <div className="p-3 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-gray-600">Loading properties...</span>
                    </div>
                  </div>
                ) : (
                  properties.map((property) => (
                  <div key={property.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                          <Building2 className="h-3 w-3 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{property.name}</h3>
                          <p className="text-xs text-gray-500">{property.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleBlockToggle(selectedAgent.id, property.id)}
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                            isAgentBlocked(selectedAgent.id, property.id)
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          {isAgentBlocked(selectedAgent.id, property.id) ? 'Blocked' : 'Active'}
                        </button>
                        {!isAgentBlocked(selectedAgent.id, property.id) && (
                          <button
                            onClick={() => handleDiscountEdit(selectedAgent.id, property.id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {getPropertyDiscount(selectedAgent.id, property.id) ? 'Edit' : 'Set'}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isAgentBlocked(selectedAgent.id, property.id) && (
                      <div className="mt-2">
                        {getPropertyDiscount(selectedAgent.id, property.id) ? (
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                {getPropertyDiscount(selectedAgent.id, property.id).type === 'percentage' ? (
                                  <Percent className="h-3 w-3 text-green-600" />
                                ) : (
                                  <IndianRupee className="h-3 w-3 text-green-600" />
                                )}
                                <span className="text-sm font-semibold text-green-800">
                                  {getPropertyDiscount(selectedAgent.id, property.id).type === 'percentage' 
                                    ? `${getPropertyDiscount(selectedAgent.id, property.id).value}%` 
                                    : `₹${getPropertyDiscount(selectedAgent.id, property.id).value}`}
                                </span>
                                <span className="text-xs text-green-600">
                                  {getPropertyDiscount(selectedAgent.id, property.id).type === 'percentage' ? 'discount' : 'off'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDiscountDelete(selectedAgent.id, property.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-green-700 mt-1">
                              Applied to all rate plans
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
                            <p className="text-xs text-gray-500">No discount set</p>
                          </div>
                        )}
                      </div>
                    )}

                    {isAgentBlocked(selectedAgent.id, property.id) && (
                      <div className="text-center py-2">
                        <Ban className="h-4 w-4 text-red-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Blocked from this property</p>
                      </div>
                    )}
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && editingProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-sm mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Set Discount</h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    id="percentage-btn"
                    className={`px-3 py-2 rounded text-sm transition-colors ${discountType === 'percentage' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Percent className="h-3 w-3 mx-auto mb-1" />
                    %
                  </button>
                  <button
                    onClick={() => setDiscountType('flat')}
                    id="flat-btn"
                    className={`px-3 py-2 rounded text-sm transition-colors ${discountType === 'flat' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <IndianRupee className="h-3 w-3 mx-auto mb-1" />
                    ₹
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter value"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    id="offer-value"
                    value={discountValue}
                    onChange={(e)=> setDiscountValue(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-400 text-xs" id="offer-symbol">{discountType === 'percentage' ? '%' : '₹'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="px-3 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const value = parseFloat(discountValue);
                    handleDiscountSave(discountType, value);
                  }}
                  disabled={loading || discountValue === ''}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />
    </div>
  );
};

export default Agents;