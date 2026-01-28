import React, { useEffect } from 'react';

const PrivacyPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 selection:bg-blue-100">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Privacy Policy</h1>

                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h2>
                        <p>
                            We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, items requested (for delivery services), delivery notes, and other information you choose to provide.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h2>
                        <p>
                            We use the information we collect about you to provide, maintain, and improve our services, such as to:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Process and complete your transactions</li>
                            <li>Send you related information, including confirmations, invoices, technical notices, updates, security alerts, and support and administrative messages</li>
                            <li>Respond to your comments, questions, and requests</li>
                            <li>Communicate with you about products, services, offers, promotions, rewards, and events offered by Zomestay</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Sharing of Information</h2>
                        <p>
                            We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>With third party service providers to enable them to provide the services you request</li>
                            <li>With the general public if you submit content in a public forum, such as blog comments, social media posts, or other features of our services that are viewable by the general public</li>
                            <li>With third parties with whom you choose to let us share information, for example other apps or websites that integrate with our API or Services, or those with an API or Service with which we integrate</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Security</h2>
                        <p>
                            Zomestay takes reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Changes to this Policy</h2>
                        <p>
                            We may change this privacy policy from time to time. If we make significant changes in the way we treat your personal information, or to the privacy policy, we will provide you notice through the Services or by some other means, such as email.
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

export default PrivacyPolicy;
