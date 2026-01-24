import { useState, useEffect, useRef } from "react";
import { DollarSign, Plus, Trash2, Info } from "lucide-react";

const DEFAULT_TAX_SLABS = [
  { min: 0, max: 999, rate: 0 },
  { min: 1000, max: 7499, rate: 5 },
  { min: 7500, max: null, rate: 18 }
];

const TaxConfigurationSection = ({
  formData,
  errors,
  handleInputChange,
  onTaxSlabsChange,
  isEdit,
  onSave,
  isSaving,
  isAdmin = true,
}) => {
  // Initialize state from formData or defaults
  const [taxSlabs, setTaxSlabs] = useState(
    formData.taxSlabs?.length > 0 ? formData.taxSlabs : DEFAULT_TAX_SLABS
  );
  const [cessRate, setCessRate] = useState(formData.cessRate || "");
  
  // Use ref to track if update is from user input (prevents sync loop)
  const isUserInputRef = useRef(false);

  // Sync with formData only when changed externally (not from user input)
  useEffect(() => {
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }

    if (formData.taxSlabs?.length > 0) {
      setTaxSlabs(formData.taxSlabs);
    }
    if (formData.cessRate !== undefined) {
      setCessRate(formData.cessRate);
    }
  }, [formData.taxSlabs, formData.cessRate]);

  // Helper: Convert input value to number (handles empty strings, decimals, etc.)
  const parseNumber = (value, allowEmpty = false) => {
    if (value === "" || value === null || value === undefined) {
      return allowEmpty ? null : undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  };

  // Update a single field in a tax slab - Simple: just validate it's a number
  const handleSlabChange = (index, field, value) => {
    const updatedSlabs = taxSlabs.map((slab, i) => {
      if (i !== index) return slab;

      const updatedSlab = { ...slab };

      // Handle max field (can be null for "no limit")
      if (field === "max") {
        // If empty, set to null (no limit)
        if (value === "" || value === null || value === undefined) {
          updatedSlab.max = null;
          return updatedSlab;
        }
        
        // Try to parse as number - if valid, update it
        const numValue = parseNumber(value, true);
        if (numValue !== undefined && numValue !== null) {
          updatedSlab.max = numValue;
          return updatedSlab;
        }
        
        // If invalid number, keep current value
        return slab;
      }

      // Handle min and rate fields (must be numbers)
      if (field === "min" || field === "rate") {
        // If empty, set to 0 (input will show empty via value prop)
        if (value === "" || value === null || value === undefined) {
          updatedSlab[field] = 0;
          return updatedSlab;
        }
        
        // Try to parse as number - if valid, update it
        const numValue = parseNumber(value);
        if (numValue !== undefined) {
          updatedSlab[field] = numValue;
          return updatedSlab;
        }
        
        // If invalid number, keep current value
        return slab;
      }

      return updatedSlab;
    });

    isUserInputRef.current = true;
    setTaxSlabs(updatedSlabs);
    onTaxSlabsChange?.(updatedSlabs);
  };

  // Add a new tax slab
  const addSlab = () => {
    const lastSlab = taxSlabs[taxSlabs.length - 1];
    const newMin = lastSlab?.max !== null ? lastSlab.max + 1 : (lastSlab?.min || 0) + 1000;
    const newSlab = { min: newMin, max: null, rate: 18 };
    const updatedSlabs = [...taxSlabs, newSlab];
    
    isUserInputRef.current = true;
    setTaxSlabs(updatedSlabs);
    onTaxSlabsChange?.(updatedSlabs);
  };

  // Remove a tax slab (keep at least one)
  const removeSlab = (index) => {
    if (taxSlabs.length <= 1) return;
    
    const updatedSlabs = taxSlabs.filter((_, i) => i !== index);
    isUserInputRef.current = true;
    setTaxSlabs(updatedSlabs);
    onTaxSlabsChange?.(updatedSlabs);
  };

  // Get GST rate for a given tariff
  const getGSTRate = (tariff) => {
    for (const slab of taxSlabs) {
      const min = slab.min || 0;
      const max = slab.max;
      if (tariff >= min && (max === null || tariff <= max)) {
        return slab.rate;
      }
    }
    return 0;
  };

  // Handle CESS rate change
  const handleCessRateChange = (e) => {
    const value = e.target.value;
    
    isUserInputRef.current = true;
    setCessRate(value);
    
    // Update parent form data
    if (handleInputChange) {
      const numValue = parseNumber(value, true);
      handleInputChange({
        target: {
          name: "cessRate",
          value: numValue !== undefined ? numValue : value
        }
      });
    }
  };

  // Hide for non-admin users
  if (!isAdmin) return null;

  // Calculate example tax breakdown
  const calculateExample = () => {
    const baseAmount = 5000;
    const gstRate = getGSTRate(baseAmount);
    const gstAmount = (baseAmount * gstRate) / 100;
    const cessAmount = cessRate ? (baseAmount * Number(cessRate)) / 100 : 0;
    const totalTax = gstAmount + cessAmount;
    
    return { baseAmount, gstRate, gstAmount, cessAmount, totalTax };
  };

  const example = calculateExample();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center">
          <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
          Tax Configuration
        </h2>
      </div>

      <div className="p-6">
        {/* Info Box */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Tax Calculation Rules:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Tax is calculated based on room tariff per day</li>
                <li>CGST + SGST for same state bookings</li>
                <li>IGST for different state bookings</li>
                <li>CESS (if set) is calculated on base amount</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tax Slabs Section */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-700 mb-3">
            Tax Slabs (Based on Room Tariff per Day) *
          </label>
          
          {errors.taxSlabs && (
            <p className="text-red-500 text-xs mb-2">{errors.taxSlabs}</p>
          )}
          
          <div className="space-y-3">
            {taxSlabs.map((slab, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex-1 grid grid-cols-4 gap-3">
                  {/* Min Field */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min (₹) *</label>
                    <input
                      type="number"
                      value={slab.min === 0 ? 0 : slab.min}
                      onChange={(e) => handleSlabChange(index, "min", e.target.value)}
                      min="0"
                      step="1"
                      required
                      className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                        errors[`taxSlab_${index}_min`] || errors[`taxSlab_${index}_gap`]
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {(errors[`taxSlab_${index}_min`] || errors[`taxSlab_${index}_gap`]) && (
                      <p className="text-red-500 text-xs mt-0.5">
                        {errors[`taxSlab_${index}_min`] || errors[`taxSlab_${index}_gap`]}
                      </p>
                    )}
                  </div>

                  {/* Max Field */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max (₹)</label>
                    <input
                      type="number"
                      value={slab.max === null ? "" : slab.max}
                      onChange={(e) => handleSlabChange(index, "max", e.target.value)}
                      min={slab.min}
                      step="1"
                      placeholder="No limit"
                      className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                        errors[`taxSlab_${index}_max`] || errors[`taxSlab_${index}_overlap`]
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {slab.max === null && !errors[`taxSlab_${index}_max`] && (
                      <p className="text-xs text-gray-500 mt-0.5">No upper limit</p>
                    )}
                    {(errors[`taxSlab_${index}_max`] || errors[`taxSlab_${index}_overlap`]) && (
                      <p className="text-red-500 text-xs mt-0.5">
                        {errors[`taxSlab_${index}_max`] || errors[`taxSlab_${index}_overlap`]}
                      </p>
                    )}
                  </div>

                  {/* Rate Field */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">GST Rate (%) *</label>
                    <input
                      type="number"
                      value={slab.rate === 0 ? 0 : slab.rate}
                      onChange={(e) => handleSlabChange(index, "rate", e.target.value)}
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                        errors[`taxSlab_${index}_rate`]
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors[`taxSlab_${index}_rate`] && (
                      <p className="text-red-500 text-xs mt-0.5">{errors[`taxSlab_${index}_rate`]}</p>
                    )}
                  </div>

                  {/* Delete Button */}
                  <div className="flex items-end">
                    {taxSlabs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlab(index)}
                        className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSlab}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200"
          >
            <Plus className="h-3 w-3" />
            Add Tax Slab
          </button>
        </div>

        {/* CESS Rate Section */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            CESS Rate (%) <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <input
            type="number"
            name="cessRate"
            value={cessRate}
            onChange={handleCessRateChange}
            min="0"
            max="100"
            step="0.01"
            placeholder="e.g., 0.5"
            className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Additional tax percentage applied on base amount (separate from GST)
          </p>
          {errors.cessRate && (
            <p className="text-red-500 text-xs mt-1">{errors.cessRate}</p>
          )}
        </div>

        {/* Tax Calculation Preview */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">Tax Calculation Preview</h3>
          
          <div className="space-y-2 text-xs mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Room Tariff: ₹500/day</span>
              <span className="text-gray-900 font-medium">GST: {getGSTRate(500)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Room Tariff: ₹5,000/day</span>
              <span className="text-gray-900 font-medium">GST: {getGSTRate(5000)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Room Tariff: ₹10,000/day</span>
              <span className="text-gray-900 font-medium">GST: {getGSTRate(10000)}%</span>
            </div>
            {cessRate && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-600">CESS Rate:</span>
                  <span className="text-gray-900 font-medium">{cessRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Example Calculation */}
          <div className="p-3 bg-white border border-gray-200 rounded">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Example: ₹5,000 booking (1 night)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Base Amount:</span>
                <span>₹{example.baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST ({example.gstRate}%):</span>
                <span>₹{example.gstAmount.toFixed(2)}</span>
              </div>
              {cessRate && example.cessAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>CESS ({cessRate}%):</span>
                  <span>₹{example.cessAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total Amount:</span>
                <span>₹{(example.baseAmount + example.totalTax).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button (Edit Mode Only) */}
        {isEdit && (
          <div className="mt-6 flex justify-end pr-5 pb-3">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Update Tax Configuration"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxConfigurationSection;
