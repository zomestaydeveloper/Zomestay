import { useState } from "react";
import { X } from "lucide-react";

const MultiSelect = ({ options, selected, onChange, placeholder, onAddNew, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((o) =>
    (o.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (option) => {
    const isSelected = selected.some((item) => item.id === option.id);
    onChange(
      isSelected
        ? selected.filter((item) => item.id !== option.id)
        : [...selected, option]
    );
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        className="border border-gray-300 rounded p-2 min-h-[40px] cursor-pointer bg-white"
        onClick={() => setIsOpen((s) => !s)}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selected.map((item) => (
              <span
                key={item.id}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1"
              >
                {item.name}
                <X
                  size={12}
                  className="cursor-pointer hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selected.filter((s) => s.id !== item.id));
                  }}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 z-10 max-h-56 overflow-y-auto">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search..."
              className="w-full p-1 text-sm border border-gray-300 rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.map((option) => {
              const checked = selected.some((s) => s.id === option.id);
              return (
                <div
                  key={option.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                  onClick={() => handleToggleOption(option)}
                >
                  <input type="checkbox" checked={checked} readOnly />
                  <span className="text-sm">{option.name}</span>
                </div>
              );
            })}
          </div>

          {onAddNew && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => {
                  onAddNew();
                  setIsOpen(false);
                }}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-800"
              >
                + Add New {label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;

