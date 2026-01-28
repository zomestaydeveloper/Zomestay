import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, Search, Shield, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import axiosInstance from '../../services/api/axiosConfig';
import HOST_ADMIN_COMMON from '../../services/api/endpoints/hostAdminCommonEndpoints';

const HostList = () => {
    const [hosts, setHosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchHosts();
    }, []);

    const fetchHosts = async () => {
        try {
            setError(null);
            const response = await axiosInstance.get(HOST_ADMIN_COMMON.HOSTS.ALL);
            if (response.data.success) {
                setHosts(response.data.data);
            } else {
                setError('Failed to fetch hosts data');
            }
        } catch (err) {
            console.error('Error fetching hosts:', err);
            setError('An error occurred while loading hosts');
        } finally {
            setLoading(false);
        }
    };

    const filteredHosts = hosts.filter(host =>
        host.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Hosts Management</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        View and manage all registered hosts on the platform
                    </p>
                </div>

                {/* Filters & Actions */}
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                            Total Hosts: {hosts.length}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">
                        {error}
                        <button
                            onClick={fetchHosts}
                            className="block mx-auto mt-4 text-sm underline hover:text-red-800"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Host Details</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredHosts.length > 0 ? (
                                        filteredHosts.map((host) => (
                                            <tr key={host.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0">
                                                            {host.profileImage ? (
                                                                <img
                                                                    className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                                                    src={host.profileImage} // Assuming full URL or handled by a utility
                                                                    alt=""
                                                                    onError={(e) => {
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${host.firstName}+${host.lastName}&background=random`
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                                                                    {host.firstName?.[0]}{host.lastName?.[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {host.firstName} {host.lastName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">ID: {host.id.slice(0, 8)}...</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col space-y-1">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                                            {host.email}
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Phone className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                                            {host.phone || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col space-y-2">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${host.isActive
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {host.isActive ? (
                                                                <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                                                            ) : (
                                                                <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                                                            )}
                                                        </span>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${host.isVerified
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {host.isVerified ? (
                                                                <><Shield className="w-3 h-3 mr-1" /> Verified</>
                                                            ) : (
                                                                <><ShieldAlert className="w-3 h-3 mr-1" /> Unverified</>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-medium">
                                                        {host._count?.properties || 0}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Properties Listed</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                        {formatDate(host.createdAt)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Search className="h-10 w-10 text-gray-300 mb-2" />
                                                    <p className="text-lg font-medium text-gray-900">No hosts found</p>
                                                    <p className="text-sm">Try adjusting your search terms</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination could be added here */}
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                                Showing {filteredHosts.length} of {hosts.length} hosts
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostList;
