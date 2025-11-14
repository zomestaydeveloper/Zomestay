import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationModal = ({ 
  isOpen, 
  type = 'success', // 'success', 'error', 'info', 'warning'
  title, 
  message, 
  onClose 
}) => {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100',
          titleColor: 'text-green-900',
          buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          titleColor: 'text-red-900',
          buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          iconColor: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          titleColor: 'text-yellow-900',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          titleColor: 'text-blue-900',
          buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      default:
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100',
          titleColor: 'text-green-900',
          buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        };
    }
  };

  const { icon: Icon, iconColor, iconBg, titleColor, buttonColor } = getIconAndColors();

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 bg-opacity-50 z-[60]" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-6 mx-4">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 p-2 rounded-full ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-medium ${titleColor}`}>
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors ${buttonColor}`}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationModal;
