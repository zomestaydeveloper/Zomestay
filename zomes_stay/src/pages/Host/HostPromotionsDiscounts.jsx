import { useState } from "react";

// Mock property images (you'll need to replace these with your actual imports)
const img1 = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop";
const img2 = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop";
const img3 = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop";
const img4 = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop";
const img5 = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop";
const img6 = "https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=400&h=300&fit=crop";
const img7 = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop";
const img8 = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop";

const properties = [
  { id: 1, image: img1, title: "Beach Vibes", location: "Malibu, USA", price: 5000, status: "active" },
  { id: 2, image: img2, title: "Mountain Retreat", location: "Aspen, USA", price: 7500, status: "active" },
  { id: 3, image: img3, title: "City Lights", location: "Tokyo, Japan", price: 4200, status: "active" },
  { id: 4, image: img4, title: "Desert Escape", location: "Dubai, UAE", price: 8000, status: "active" },
  { id: 5, image: img5, title: "Tropical Paradise", location: "Bali, Indonesia", price: 3500, status: "active" },
  { id: 6, image: img6, title: "Snowy Peak", location: "Swiss Alps", price: 9500, status: "active" },
  { id: 7, image: img7, title: "Lakeside Villa", location: "Lake Como, Italy", price: 6800, status: "active" },
  { id: 8, image: img8, title: "Urban Loft", location: "New York, USA", price: 5500, status: "active" },
];

const mockPromotions = [
  {
    id: 1,
    propertyId: 1,
    property: "Beach Vibes",
    originalPrice: 5000,
    discountType: "percentage",
    discountValue: 20,
    finalPrice: 4000,
    startDate: "2025-08-25",
    endDate: "2025-09-25",
    status: "active",
    description: "Summer Special - Early Bird Discount",
    minStay: 3,
    maxBookings: 50,
    currentBookings: 12,
    createdDate: "2025-08-20"
  },
  {
    id: 2,
    propertyId: 3,
    property: "City Lights",
    originalPrice: 4200,
    discountType: "fixed",
    discountValue: 800,
    finalPrice: 3400,
    startDate: "2025-08-20",
    endDate: "2025-09-15",
    status: "active",
    description: "Weekend Getaway Deal",
    minStay: 2,
    maxBookings: 30,
    currentBookings: 8,
    createdDate: "2025-08-15"
  },
  {
    id: 3,
    propertyId: 5,
    property: "Tropical Paradise",
    originalPrice: 3500,
    discountType: "percentage",
    discountValue: 15,
    finalPrice: 2975,
    startDate: "2025-08-10",
    endDate: "2025-08-30",
    status: "expired",
    description: "Monsoon Special Offer",
    minStay: 5,
    maxBookings: 25,
    currentBookings: 25,
    createdDate: "2025-08-05"
  }
];

export default function PromotionsDiscounts() {
  const [promotions, setPromotions] = useState(mockPromotions);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [formData, setFormData] = useState({
    propertyId: "",
    discountType: "percentage",
    discountValue: "",
    startDate: "",
    endDate: "",
    description: "",
    minStay: 1,
    maxBookings: ""
  });

  // Filter promotions
  const filteredPromotions = promotions.filter(promo => {
    if (filterStatus === "all") return true;
    return promo.status === filterStatus;
  });

  // Calculate statistics
  const totalPromotions = promotions.length;
  const activePromotions = promotions.filter(p => p.status === 'active').length;
  const expiredPromotions = promotions.filter(p => p.status === 'expired').length;
  const totalSavings = promotions.reduce((sum, p) => {
    if (p.status === 'active') {
      return sum + (p.originalPrice - p.finalPrice) * p.currentBookings;
    }
    return sum;
  }, 0);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const calculateFinalPrice = () => {
    const property = properties.find(p => p.id === parseInt(formData.propertyId));
    if (!property || !formData.discountValue) return 0;

    if (formData.discountType === 'percentage') {
      return property.price - (property.price * formData.discountValue / 100);
    } else {
      return property.price - formData.discountValue;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const property = properties.find(p => p.id === parseInt(formData.propertyId));
    
    if (!property) return;

    const finalPrice = calculateFinalPrice();
    const discountAmount = property.price - finalPrice;

    const promotionData = {
      id: editingPromotion ? editingPromotion.id : Date.now(),
      propertyId: parseInt(formData.propertyId),
      property: property.title,
      originalPrice: property.price,
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      finalPrice: Math.round(finalPrice),
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: new Date(formData.startDate) <= new Date() && new Date(formData.endDate) >= new Date() ? 'active' : 
              new Date(formData.endDate) < new Date() ? 'expired' : 'scheduled',
      description: formData.description,
      minStay: parseInt(formData.minStay),
      maxBookings: parseInt(formData.maxBookings),
      currentBookings: editingPromotion ? editingPromotion.currentBookings : 0,
      createdDate: editingPromotion ? editingPromotion.createdDate : new Date().toISOString().split('T')[0]
    };

    if (editingPromotion) {
      setPromotions(prev => prev.map(p => p.id === editingPromotion.id ? promotionData : p));
    } else {
      setPromotions(prev => [promotionData, ...prev]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      discountType: "percentage",
      discountValue: "",
      startDate: "",
      endDate: "",
      description: "",
      minStay: 1,
      maxBookings: ""
    });
    setEditingPromotion(null);
    setShowModal(false);
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      propertyId: promotion.propertyId.toString(),
      discountType: promotion.discountType,
      discountValue: promotion.discountValue.toString(),
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      description: promotion.description,
      minStay: promotion.minStay,
      maxBookings: promotion.maxBookings.toString()
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this promotion?")) {
      setPromotions(prev => prev.filter(p => p.id !== id));
    }
  };

  const toggleStatus = (id) => {
    setPromotions(prev => prev.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'active' ? 'paused' : 'active';
        return { ...p, status: newStatus };
      }
      return p;
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-red-600 bg-red-50';
      case 'paused': return 'text-yellow-600 bg-yellow-50';
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDiscount = (type, value) => {
    return type === 'percentage' ? `${value}%` : `₹${value}`;
  };

  return (
    <div className="p-6 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Promotions & Discounts</h2>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Promotion
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800">Total Promotions</h3>
          <p className="text-2xl font-bold text-blue-900">{totalPromotions}</p>
          <p className="text-xs text-blue-600 mt-1">All time</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Active Promotions</h3>
          <p className="text-2xl font-bold text-green-900">{activePromotions}</p>
          <p className="text-xs text-green-600 mt-1">Currently running</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Expired</h3>
          <p className="text-2xl font-bold text-red-900">{expiredPromotions}</p>
          <p className="text-xs text-red-600 mt-1">Past promotions</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-800">Total Savings</h3>
          <p className="text-2xl font-bold text-purple-900">₹{totalSavings.toLocaleString()}</p>
          <p className="text-xs text-purple-600 mt-1">Customer savings</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Promotions</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="paused">Paused</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full min-w-[1100px] bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Original Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Discount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Final Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Bookings
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPromotions.map((promotion) => (
              <tr key={promotion.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{promotion.property}</div>
                  <div className="text-xs text-gray-500">{promotion.description}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  ₹{promotion.originalPrice.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {formatDiscount(promotion.discountType, promotion.discountValue)} OFF
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                  ₹{promotion.finalPrice.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                  <div>{promotion.startDate}</div>
                  <div>to {promotion.endDate}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <div>{promotion.currentBookings}/{promotion.maxBookings}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${(promotion.currentBookings / promotion.maxBookings) * 100}%` }}
                    ></div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(promotion.status)}`}>
                    {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  <button
                    onClick={() => handleEdit(promotion)}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(promotion.id)}
                    className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                      promotion.status === 'active' 
                        ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' 
                        : 'text-green-600 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {promotion.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(promotion.id)}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-600 bg-red-50 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPromotions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No promotions found.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50  bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                    <select
                      name="propertyId"
                      value={formData.propertyId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Property</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>
                          {property.title} - ₹{property.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      name="discountType"
                      value={formData.discountType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stay (nights)</label>
                    <input
                      type="number"
                      name="minStay"
                      value={formData.minStay}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Bookings</label>
                    <input
                      type="number"
                      name="maxBookings"
                      value={formData.maxBookings}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Enter promotion description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.propertyId && formData.discountValue && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Price Preview</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Original Price:</span>
                        <div className="font-semibold">
                          ₹{properties.find(p => p.id === parseInt(formData.propertyId))?.price.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <div className="font-semibold text-orange-600">
                          {formatDiscount(formData.discountType, formData.discountValue)} OFF
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Final Price:</span>
                        <div className="font-semibold text-green-600">
                          ₹{Math.round(calculateFinalPrice()).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}