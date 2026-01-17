import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import Inventory from '../../components/shared/Inventory/Inventory';
import { CardLoader, SkeletonList } from '../../components/Loader';
import { propertyService } from '../../services';

const Host_inventory = () => {
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [propertiesList, setPropertiesList] = useState([]);

    const fetchProperties = async () => {
        try {
            setLoading(true);
            const res = await propertyService.getPropertiesList();
            if (res.data?.success) {
                setPropertiesList(res.data.data || []);
            }
        } catch (err) {
            console.error("Host property fetch failed", err);
            setPropertiesList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    useEffect(() => {
        if (!selectedProperty && propertiesList.length > 0) {
            setSelectedProperty(propertiesList[0]);
        }
    }, [propertiesList]);

    const filteredProperties = propertiesList.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePropertySelect = (property) => {
        setSelectedProperty(property);
        setShowPropertyDropdown(false);
        setSearchTerm('');
    };

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Header */}
            <div className="bg-white flex justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <Building2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                        Manage your property inventory
                    </p>
                </div>

                <div className="relative w-[320px]">
                    <button
                        onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg w-full hover:bg-gray-50"
                    >
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="flex-1 text-left">
                            {loading ? "Loading..." : selectedProperty?.name || "Select Property"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    {showPropertyDropdown && (
                        <div className="absolute mt-1 w-full bg-white border rounded-lg shadow-lg z-50">
                            <input
                                className="w-full p-2 border-b text-sm"
                                placeholder="Search properties..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="max-h-60 overflow-y-auto">
                                {loading ? (
                                    <div className="p-3">
                                        <SkeletonList count={3} />
                                    </div>
                                ) : filteredProperties.length === 0 ? (
                                    <div className="p-3 text-center text-gray-500 text-sm">
                                        No properties found
                                    </div>
                                ) : (
                                    filteredProperties.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handlePropertySelect(p)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                        >
                                            <div className="font-medium text-sm">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.location}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Inventory Section */}
            {loading && (
                <div className="p-6">
                    <CardLoader text="Loading inventory..." />
                </div>
            )}

            {!loading && selectedProperty && (
                <div className="p-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Inventory — {selectedProperty.name}
                        </h3>
                        <Inventory propertyId={selectedProperty.id} isAdmin={false} adminProperty={selectedProperty} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Host_inventory;
