import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { CardLoader, SkeletonList } from '../../components/Loader';
import { propertyService } from '../../services';
import MealPlans from '../../components/shared/MealPlans/MealPlans';

export const Host_mealplan = () => {
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
            <div className="bg-white flex justify-between px-6 py-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <Building2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Manage Meal Plans</p>
                </div>

                <div className="relative w-[320px]">
                    <button
                        onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 border rounded-lg w-full"
                    >
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="flex-1 text-left">
                            {loading ? "Loading..." : selectedProperty?.name || "Select Property"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    {showPropertyDropdown && (
                        <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg z-50">
                            <input
                                className="w-full p-2 border-b text-sm"
                                placeholder="Search properties..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="max-h-60 overflow-y-auto">
                                {filteredProperties.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePropertySelect(p)}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                    >
                                        <div className="font-medium text-sm">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.location}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading && <CardLoader text="Loading meal plans..." />}

            {!loading && selectedProperty && (
                <div className="p-6">
                    <div className="bg-white rounded-lg border p-4">
                        <h3 className="text-lg font-semibold mb-3">
                            Meal Plans — {selectedProperty.name}
                        </h3>

                        <MealPlans
                            isAdmin={false}
                            adminProperty={selectedProperty}
                            propertyId={selectedProperty.id}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Host_mealplan;
