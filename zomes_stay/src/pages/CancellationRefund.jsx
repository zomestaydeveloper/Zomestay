import React, { useEffect } from 'react';

const CancellationRefund = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 selection:bg-blue-100">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Cancellation & Refund Policy</h1>

                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Cancellation Policy</h2>
                        <p>
                            We understand that plans can change. You may cancel your reservation or service request subject to the following terms:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Cancellations made 48 hours or more before the scheduled check-in or service time will receive a full refund.</li>
                            <li>Cancellations made between 24 and 48 hours before the scheduled time will receive a 50% refund.</li>
                            <li>Cancellations made less than 24 hours before the scheduled time are non-refundable.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Refund Eligibility</h2>
                        <p>
                            Refunds are processed based on the cancellation policy mentioned above. Additionally, refunds may be considered in the following exceptional circumstances:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>If Zomestay cancels your reservation or service due to unforeseen circumstances or operational issues, you will receive a full refund.</li>
                            <li>In case of a duplicate charge or billing error, a full refund for the excess amount will be processed.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Processing Time</h2>
                        <p>
                            Once a refund is approved, it will be processed within 5-7 business days. The time it takes for the amount to reflect in your account depends on your bank or payment provider.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Non-Refundable Services</h2>
                        <p>
                            Certain services or promotional offers may be marked as non-refundable. These will be clearly indicated at the time of booking. Please review the specific terms of your booking before confirmation.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Contact Us</h2>
                        <p>
                            If you have any questions regarding your cancellation or refund, please contact our support team at <a href="mailto:support@zomestay.com" className="text-blue-600 hover:scale-105 transition-transform inline-block">support@zomestay.com</a> or call us at <span className="text-gray-900 font-medium">+91 12345 67890</span>.
                        </p>
                    </section>

                    <div className="mt-8 pt-8 border-t text-sm text-gray-500">
                        <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancellationRefund;
