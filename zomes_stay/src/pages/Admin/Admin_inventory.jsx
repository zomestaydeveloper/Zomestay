import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Users, MapPin, Calendar, Target, Settings, Eye, BarChart3 } from 'lucide-react';
import Inventory from '../../components/shared/Inventory/Inventory';
import RatePlans from '../../components/shared/RatePlans/RatePlans';
import MealPlans from '../../components/shared/MealPlans/MealPlans';
import { CardLoader, SkeletonList } from '../../components/Loader';
import { propertyService } from '../../services';

// Mock data for demo
const mockProperties = [
  {
    id: 'prop-1',
    name: 'Grand Palace Hotel',
    location: 'Mumbai, Maharashtra',
    status: 'active',
    totalRooms: 45,
    ratePlans: 3,
    mealPlans: 4,
    lastUpdated: '2024-01-15',
    hostName: 'Rajesh Kumar'
  },
  {
    id: 'prop-2', 
    name: 'Mountain View Resort',
    location: 'Shimla, Himachal Pradesh',
    status: 'active',
    totalRooms: 28,
    ratePlans: 2,
    mealPlans: 3,
    lastUpdated: '2024-01-12',
    hostName: 'Priya Sharma'
  },
  {
    id: 'prop-3',
    name: 'Beach Paradise Villa',
    location: 'Goa, Goa',
    status: 'maintenance',
    totalRooms: 12,
    ratePlans: 1,
    mealPlans: 2,
    lastUpdated: '2024-01-10',
    hostName: 'Amit Patel'
  },
  {
    id: 'prop-4',
    name: 'Heritage Palace',
    location: 'Jaipur, Rajasthan',
    status: 'active',
    totalRooms: 35,
    ratePlans: 4,
    mealPlans: 5,
    lastUpdated: '2024-01-14',
    hostName: 'Sunita Singh'
  }
];

const Admin_inventory = () => {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [propertiesList, setPropertiesList] = useState([]);

  // Filter properties based on search
  const filteredProperties = propertiesList.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.hostName.toLowerCase().includes(searchTerm.toLowerCase())
  );
   
const fetchProperties = async () => {
 try{
  setLoading(true);
  const response = await propertyService.getPropertiesList();
  console.log('Properties response:', response);
  
  if (response.data.success && response.data.data) {
    setPropertiesList(response.data.data);
  } else {
    console.error('Invalid response format:', response);
    setPropertiesList([]);
  }
 }catch(error){
    console.error("Failed to fetch properties", error);
    setPropertiesList([]);
  } 
  finally{
    setLoading(false);
  }
};

useEffect(() => {
  fetchProperties();
}, []);

// Set first property as default when properties are loaded
useEffect(() => {
  if (!selectedProperty && propertiesList.length > 0) {
    setSelectedProperty(propertiesList[0]);
  }
}, [propertiesList, selectedProperty]);

console.log('Properties list:', propertiesList);

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setShowPropertyDropdown(false);
    setSearchTerm('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Calendar },
    { id: 'rates', label: 'Rate Plans', icon: Target },
    { id: 'meals', label: 'Meal Plans', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">Manage all properties' inventory, rates, and meal plans</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-left">
                  {loading ? 'Loading properties...' : selectedProperty ? selectedProperty.name : 'Select Property'}
                </span>
                {!loading && <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>

              {/* Property Dropdown */}
              {showPropertyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search properties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Property List */}
                  <div className="max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="p-4">
                        <SkeletonList count={3} />
                      </div>
                    ) : filteredProperties.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No properties found
                      </div>
                    ) : (
                      filteredProperties.map((property) => (
                      <button
                        key={property.id}
                        onClick={() => handlePropertySelect(property)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          selectedProperty?.id === property.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{property.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                                {property.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{property.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{property.hostName}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                              <span>{property.totalRooms} rooms</span>
                              <span>{property.ratePlans} rate plans</span>
                              <span>{property.mealPlans} meal plans</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Property Info Bar */}
      {selectedProperty && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedProperty.name}</h2>
                <p className="text-sm text-gray-600">{selectedProperty.location}</p>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Host: {selectedProperty.hostName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Last updated: {selectedProperty.lastUpdated}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedProperty.status)}`}>
                {selectedProperty.status}
              </span>
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {selectedProperty && (
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="p-6">
            <CardLoader text="Loading properties..." />
          </div>
        ) : !selectedProperty ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Property</h3>
              <p className="text-gray-500">Choose a property from the dropdown to manage its inventory</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Management</h3>
                  <div className="text-sm text-gray-500">
                    Managing: <span className="font-medium">{selectedProperty.name}</span>
                  </div>
                </div>
                <Inventory 
                  propertyId={selectedProperty.id} 
                  isAdmin={true}
                  adminProperty={selectedProperty}
                />
                {console.log('Admin_inventory - Passing to Inventory:', {
                  propertyId: selectedProperty.id,
                  isAdmin: true,
                  adminProperty: selectedProperty
                })}
              </div>
            )}
            
            {activeTab === 'rates' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Rate Plans Management</h3>
                  <div className="text-sm text-gray-500">
                    Managing: <span className="font-medium">{selectedProperty.name}</span>
                  </div>
                </div>
                <RatePlans 
                  propertyId={selectedProperty.id} 
                  isAdmin={true}
                  adminProperty={selectedProperty}
                />
              </div>
            )}
            
            {activeTab === 'meals' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Meal Plans Management</h3>
                  <div className="text-sm text-gray-500">
                    Managing: <span className="font-medium">{selectedProperty.name}</span>
                  </div>
                </div>
                <MealPlans 
                  propertyId={selectedProperty.id} 
                  isAdmin={true}
                  adminProperty={selectedProperty}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin_inventory;