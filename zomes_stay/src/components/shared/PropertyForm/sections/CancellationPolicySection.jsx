import { User } from "lucide-react";

const CancellationPolicySection = ({
  formData,
  errors,
  cancellationPolicies,
  selectedCancellationPolicy,
  handleInputChange,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center">
          <User className="h-4 w-4 mr-2 text-blue-600" />
          Cancellation Policy
        </h2>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Select a policy *
          </label>
          <select
            name="cancellationPolicyId"
            value={formData.cancellationPolicyId}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Cancellation Policy</option>
            {cancellationPolicies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
              </option>
            ))}
          </select>
          {errors.cancellationPolicyId && (
            <p className="text-red-500 text-xs mt-1">{errors.cancellationPolicyId}</p>
          )}
        </div>

        <div className="border border-gray-100 rounded-lg bg-gray-50 p-4">
          {selectedCancellationPolicy ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCancellationPolicy.name}
                  </p>
                  {selectedCancellationPolicy.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedCancellationPolicy.description}
                    </p>
                  )}
                </div>
                {selectedCancellationPolicy.isDefault && (
                  <span className="px-2 py-1 text-[10px] font-semibold text-green-700 bg-green-100 rounded-full uppercase tracking-wide">
                    Default
                  </span>
                )}
              </div>

              {selectedCancellationPolicy.rules && selectedCancellationPolicy.rules.length > 0 ? (
                <div className="space-y-2">
                  {selectedCancellationPolicy.rules
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((rule) => (
                      <div
                        key={`${rule.daysBefore}-${rule.sortOrder}`}
                        className="flex items-center justify-between bg-white rounded-md border border-gray-100 px-3 py-2"
                      >
                        <div className="text-xs text-gray-600">
                          {rule.daysBefore === 0
                            ? "On check-in day"
                            : `${rule.daysBefore} day${rule.daysBefore > 1 ? "s" : ""} before`}
                        </div>
                        <div className="text-xs font-semibold text-gray-900">
                          {rule.refundPercentage}% refund
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No specific rules defined for this policy.
                </p>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-500">
              Select a cancellation policy to preview its refund rules.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicySection;

