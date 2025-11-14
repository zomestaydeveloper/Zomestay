import { useState } from "react";

const mockBookings = [
  {
    id: 1,
    customer: "John Doe",
    property: "Sea View Apartment",
    room: "Deluxe Room",
    date: "2025-08-23",
    status: "Pending",
    amount: 3500,
  },
  {
    id: 2,
    customer: "Jane Smith",
    property: "Mountain Villa",
    room: "Suite",
    date: "2025-08-25",
    status: "Confirmed",
    amount: 5000,
  },
  {
    id: 3,
    customer: "Amit Kumar",
    property: "City Hostel",
    room: "Single Bed",
    date: "2025-08-28",
    status: "Cancelled",
    amount: 1200,
  },
  {
    id: 4,
    customer: "Priya Singh",
    property: "Lake Cottage",
    room: "Entire Cottage",
    date: "2025-08-30",
    status: "Pending",
    amount: 8000,
  },
  {
    id: 5,
    customer: "jishnu Singh",
    property: "Zome Stay Cottage",
    room: "Entire Cottage",
    date: "2025-08-30",
    status: "Pending",
    amount: 8000,
  },
  {
    id: 6,
    customer: "kavya Singh",
    property: "karapuzha Lake Cottage",
    room: "Entire Cottage",
    date: "2025-08-30",
    status: "Pending",
    amount: 8000,
  },
  {
    id: 7,
    customer: "Akhila",
    property: "Lake view Cottage",
    room: "Entire Cottage",
    date: "2025-08-30",
    status: "Pending",
    amount: 8000,
  },
];

export default function AllBookings() {
  const [bookings, setBookings] = useState(mockBookings);

  const handleStatusChange = (id, newStatus) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, status: newStatus } : booking
      )
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'text-green-600 bg-green-50';
      case 'Cancelled': return 'text-red-600 bg-red-50';
      case 'Pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">All Bookings</h2>
      
      {/* Fixed overflow container */}
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full min-w-[800px] bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Room
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{booking.id}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {booking.customer}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="max-w-[200px] truncate" title={booking.property}>
                    {booking.property}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="max-w-[150px] truncate" title={booking.room}>
                    {booking.room}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {booking.date}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                  ₹{booking.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <select
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none ${getStatusColor(booking.status)}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Bookings</h3>
          <p className="text-2xl font-bold text-blue-900">{bookings.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Confirmed</h3>
          <p className="text-2xl font-bold text-green-900">
            {bookings.filter(b => b.status === 'Confirmed').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800">Pending</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {bookings.filter(b => b.status === 'Pending').length}
          </p>
        </div>
      </div>
    </div>
  );
}