import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const GenericModal = ({ modal, closeModal }) => {
    if (!modal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-4 sm:p-6">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3 flex-1">
                            {modal.type === 'success' && (
                                <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                            )}
                            {modal.type === 'error' && (
                                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                            )}
                            {modal.type === 'info' && (
                                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                                    <Info className="h-6 w-6 text-blue-600" />
                                </div>
                            )}
                            <h3 className={`text-lg font-semibold flex-1 ${modal.type === 'success' ? 'text-green-900' :
                                    modal.type === 'error' ? 'text-red-900' :
                                        'text-blue-900'
                                }`}>
                                {modal.title}
                            </h3>
                        </div>
                        <button
                            onClick={closeModal}
                            className="text-gray-400 hover:text-gray-600 p-1 ml-2 flex-shrink-0"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="mb-6">
                        <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">
                            {modal.message}
                        </p>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end">
                        <button
                            onClick={closeModal}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${modal.type === 'success'
                                    ? 'bg-green-600 text-white hover:bg-green-700' :
                                    modal.type === 'error'
                                        ? 'bg-red-600 text-white hover:bg-red-700' :
                                        'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenericModal;
