import React, { useState } from "react";

const initialState = {
  firstName: "John",
  lastName: "Doe",
  email: "userstest@gmail.com",
  phone: "+91 1234 567890",
  place: "",
  subject: "Room Booking",
  message: "",
  contactMethod: "Email",
  urgency: "Normal",
};

const ContactUs = () => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    let errs = {};
    if (!form.firstName.trim()) errs.firstName = "Required";
    if (!form.lastName.trim()) errs.lastName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.phone.trim()) errs.phone = "Required";
    else if (!/^\+?\d{10,}$/.test(form.phone.replace(/\s+/g, ""))) errs.phone = "Invalid phone number";
    if (!form.message.trim()) errs.message = "Required";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitted(true);
      // Optionally send form data here
    }
  };

  return (
    <div className="w-full min-h-[90vh] bg-white flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-[1150px] mx-auto p-0 md:p-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-600 mb-6 mt-2">Contact Form</h1>
        {submitted && (
          <div className="mb-5 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            Thank you for your inquiry! We will get back to you soon.
          </div>
        )}
        <form
          className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm px-4 md:px-8 py-6 flex flex-col gap-6"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Form grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-[#374151] mb-1">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                className={`w-full h-11 rounded-lg border ${errors.firstName ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`}
                placeholder="John"
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
              />
              <div className="min-h-[18px] text-xs text-red-500 mt-1" id="firstName-error">{errors.firstName || ""}</div>
            </div>
            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-[#374151] mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                className={`w-full h-11 rounded-lg border ${errors.lastName ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`}
                placeholder="Doe"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
              />
              <div className="min-h-[18px] text-xs text-red-500 mt-1" id="lastName-error">{errors.lastName || ""}</div>
            </div>
            {/* Mail ID */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1">
                Mail ID
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                disabled
                className={`w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-400 bg-[#F3F4F6] placeholder-gray-400 cursor-not-allowed text-base`}
                placeholder="userstest@gmail.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              <div className="min-h-[18px] text-xs text-red-500 mt-1" id="email-error">{errors.email || ""}</div>
            </div>
            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#374151] mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                disabled
                className={`w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-400 bg-[#F3F4F6] placeholder-gray-400 cursor-not-allowed text-base`}
                placeholder="+91 1234 567890"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              <div className="min-h-[18px] text-xs text-red-500 mt-1" id="phone-error">{errors.phone || ""}</div>
            </div>
            {/* Place */}
            <div>
              <label htmlFor="place" className="block text-sm font-medium text-[#374151] mb-1">
                Place
              </label>
              <input
                id="place"
                name="place"
                type="text"
                value={form.place}
                onChange={handleChange}
                className="w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="Place"
              />
            </div>
            {/* Subject of Inquiry */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-[#374151] mb-1">
                Subject of Inquiry
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                className="w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="Room Booking"
              />
            </div>
            {/* Message (spans both columns) */}
            <div className="md:col-span-2">
              <label htmlFor="message" className="block text-sm font-medium text-[#374151] mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                className={`w-full min-h-[180px] rounded-lg border ${errors.message ? "border-red-400" : "border-[#E5E7EB]"} px-3 py-2 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base resize-none`}
                placeholder="Message"
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "message-error" : undefined}
              />
              <div className="min-h-[18px] text-xs text-red-500 mt-1" id="message-error">{errors.message || ""}</div>
            </div>
          </div>

          {/* Radio groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Preferred Contact Method */}
            <fieldset>
              <legend className="block text-sm font-medium text-[#374151] mb-2">Preferred Contact Method</legend>
              <div className="flex flex-col gap-2">
                {['Email', 'Phone Call', 'Text Message'].map((method) => (
                  <label key={method} className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      type="radio"
                      name="contactMethod"
                      value={method}
                      checked={form.contactMethod === method}
                      onChange={handleChange}
                      className="accent-[#004AAD] w-4 h-4"
                    />
                    {method}
                  </label>
                ))}
              </div>
            </fieldset>
            {/* Urgency of Inquiry */}
            <fieldset>
              <legend className="block text-sm font-medium text-[#374151] mb-2">Urgency of Inquiry</legend>
              <div className="flex flex-col gap-2">
                {['Urgent', 'Normal', 'Not Urgent'].map((urgency) => (
                  <label key={urgency} className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      type="radio"
                      name="urgency"
                      value={urgency}
                      checked={form.urgency === urgency}
                      onChange={handleChange}
                      className="accent-[#004AAD] w-4 h-4"
                    />
                    {urgency}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col md:flex-row gap-4 mt-2">
            <button
              type="submit"
              className="w-full md:w-auto px-8 h-12 rounded-full bg-[#004AAD] text-white font-bold text-base shadow-sm hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-[#004AAD]/50"
            >
              Submit Inquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactUs;
