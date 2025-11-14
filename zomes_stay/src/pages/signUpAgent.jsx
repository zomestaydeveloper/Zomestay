import React, { useState, useRef } from "react";

const initialState = {
  name: "",
  personalEmail: "",
  personalPhone: "",
  designation: "",
  agencyName: "",
  agencyEmail: "",
  agencyPhone: "",
  agencyArea: "",
  pan: "",
  gst: "",
  address: "",
  pin: "",
  city: "",
  state: "",
  country: "",
  file: null,
  agree: false,
};

const SignUpAgent = () => {
  // Refs for all error-prone fields
  const refs = {
    name: useRef(),
    personalEmail: useRef(),
    personalPhone: useRef(),
    agencyName: useRef(),
    agencyEmail: useRef(),
    agencyPhone: useRef(),
    address: useRef(),
    pin: useRef(),
    city: useRef(),
    state: useRef(),
    country: useRef(),
    file: useRef(),
    agree: useRef(),
  };
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef();

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setForm((prev) => ({ ...prev, file: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    let errs = {};
    // Personal details
    if (!form.name.trim()) errs.name = "This field is required.";
    if (!form.personalEmail.trim()) errs.personalEmail = "This field is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.personalEmail)) errs.personalEmail = "Invalid email.";
    if (!form.personalPhone.trim()) errs.personalPhone = "This field is required.";
    else if (!/^\d{10,}$/.test(form.personalPhone.replace(/\D/g, ""))) errs.personalPhone = "Invalid phone number.";
    // Company details
    if (!form.agencyName.trim()) errs.agencyName = "This field is required.";
    if (!form.agencyEmail.trim()) errs.agencyEmail = "This field is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.agencyEmail)) errs.agencyEmail = "Invalid email.";
    if (!form.agencyPhone.trim()) errs.agencyPhone = "This field is required.";
    else if (!/^\d{10,}$/.test(form.agencyPhone.replace(/\D/g, ""))) errs.agencyPhone = "Invalid phone number.";
    if (!form.address.trim()) errs.address = "This field is required.";
    if (!form.city.trim()) errs.city = "This field is required.";
    if (!form.state.trim()) errs.state = "This field is required.";
    if (!form.country.trim()) errs.country = "This field is required.";
    if (!form.pin.trim()) errs.pin = "This field is required.";
    else if (!/^\d{6}$/.test(form.pin)) errs.pin = "PIN must be 6 digits.";
    if (!form.file) errs.file = "Upload is a must.";
    else if (form.file.type !== "application/pdf") errs.file = "PDF only.";
    else if (form.file.size > 10 * 1024 * 1024) errs.file = "File too large (max 10MB).";
    if (!form.agree) errs.agree = "You must agree before submitting.";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        setSubmitted(true);
      }, 1200); // Demo
    } else {
      // Autofocus the first error field
      const errorOrder = [
        'name', 'personalEmail', 'personalPhone', 'agencyName', 'agencyEmail', 'agencyPhone', 'address', 'pin', 'city', 'state', 'country', 'file', 'agree'
      ];
      for (let key of errorOrder) {
        if (errs[key] && refs[key] && refs[key].current) {
          if (key === 'agree') {
            // For checkbox, focus the input
            refs[key].current.focus();
          } else {
            refs[key].current.focus();
          }
          break;
        }
      }
    }
  };

  const handleClose = () => {
    // Implement close logic (e.g., navigate away)
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center py-8 px-2">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg px-4 md:px-10 py-6 md:py-10 relative">
        {/* Close Icon */}
     
        {/* Title and Subtitle */}
        <h2 className="text-xl md:text-2xl font-semibold text-gray-600 mb-1">Create travel agency account</h2>
        <p className="text-sm text-gray-500 mb-7">So what are you waiting for? Simply fill up the form, we’ll get back to you!</p>
        {submitted && (
          <div className="mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            Thank you for submitting! We will contact you soon.
          </div>
        )}
        <form className="flex flex-col gap-8" onSubmit={handleSubmit} noValidate>
          {/* Personal Details */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-500 mt-2 mb-3">Personal details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <input id="name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Name" ref={refs.name} className={`w-full h-11 rounded-lg border ${errors.name ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="name-error">{errors.name || ""}</div>
              </div>
              {/* Mail ID */}
              <div>
                <label htmlFor="personalEmail" className="block text-sm font-medium text-gray-500 mb-1">Mail ID</label>
                <input id="personalEmail" name="personalEmail" type="email" value={form.personalEmail} onChange={handleChange} placeholder="your@email.com" ref={refs.personalEmail} className={`w-full h-11 rounded-lg border ${errors.personalEmail ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.personalEmail} aria-describedby={errors.personalEmail ? "personalEmail-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="personalEmail-error">{errors.personalEmail || ""}</div>
              </div>
              {/* Phone Number */}
              <div>
                <label htmlFor="personalPhone" className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                <input id="personalPhone" name="personalPhone" type="tel" value={form.personalPhone} onChange={handleChange} placeholder="Phone number" ref={refs.personalPhone} className={`w-full h-11 rounded-lg border ${errors.personalPhone ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.personalPhone} aria-describedby={errors.personalPhone ? "personalPhone-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="personalPhone-error">{errors.personalPhone || ""}</div>
              </div>
              {/* Designation */}
              <div>
                <label htmlFor="designation" className="block text-sm font-medium text-gray-500 mb-1">Designation</label>
                <input id="designation" name="designation" type="text" value={form.designation} onChange={handleChange} placeholder="Manager" className="w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base" />
              </div>
            </div>
          </div>
          {/* Company Details */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-500 mt-2 mb-3">Company details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Agency Name */}
              <div>
                <label htmlFor="agencyName" className="block text-sm font-medium text-gray-500 mb-1">Name of the travel agency</label>
                <input id="agencyName" name="agencyName" type="text" value={form.agencyName} onChange={handleChange} placeholder="Agency name" ref={refs.agencyName} className={`w-full h-11 rounded-lg border ${errors.agencyName ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.agencyName} aria-describedby={errors.agencyName ? "agencyName-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="agencyName-error">{errors.agencyName || ""}</div>
              </div>
              {/* Agency Email */}
              <div>
                <label htmlFor="agencyEmail" className="block text-sm font-medium text-gray-500 mb-1">Mail ID</label>
                <input id="agencyEmail" name="agencyEmail" type="email" value={form.agencyEmail} onChange={handleChange} placeholder="agency@email.com" ref={refs.agencyEmail} className={`w-full h-11 rounded-lg border ${errors.agencyEmail ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.agencyEmail} aria-describedby={errors.agencyEmail ? "agencyEmail-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="agencyEmail-error">{errors.agencyEmail || ""}</div>
              </div>
              {/* Agency Phone */}
              <div>
                <label htmlFor="agencyPhone" className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                <input id="agencyPhone" name="agencyPhone" type="tel" value={form.agencyPhone} onChange={handleChange} placeholder="Phone number" ref={refs.agencyPhone} className={`w-full h-11 rounded-lg border ${errors.agencyPhone ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.agencyPhone} aria-describedby={errors.agencyPhone ? "agencyPhone-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="agencyPhone-error">{errors.agencyPhone || ""}</div>
              </div>
              {/* Area */}
              <div>
                <label htmlFor="agencyArea" className="block text-sm font-medium text-gray-500 mb-1">Area where the travel agency is being operated</label>
                <input id="agencyArea" name="agencyArea" type="text" value={form.agencyArea} onChange={handleChange} placeholder="Area" className="w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base" />
              </div>
              {/* PAN */}
              <div>
                <label htmlFor="pan" className="block text-sm font-medium text-gray-500 mb-1">PAN Number</label>
                <input id="pan" name="pan" type="text" value={form.pan} onChange={handleChange} placeholder="PAN number" className="w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base" />
              </div>
              {/* GST */}
              <div>
                <label htmlFor="gst" className="block text-sm font-medium text-gray-500 mb-1">GST Number</label>
                <input id="gst" name="gst" type="text" value={form.gst} onChange={handleChange} placeholder="GST number" className="w-full h-11 rounded-lg border border-[#E5E7EB] px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base" />
              </div>
              {/* Address (spans 2 cols) */}
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-500 mb-1">Agency address</label>
                <textarea id="address" name="address" value={form.address} onChange={handleChange} placeholder="Address" ref={refs.address} className={`w-full min-h-[120px] rounded-lg border ${errors.address ? "border-red-400" : "border-[#E5E7EB]"} px-3 py-2 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base resize-none`} aria-invalid={!!errors.address} aria-describedby={errors.address ? "address-error" : undefined}></textarea>
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="address-error">{errors.address || ""}</div>
              </div>
              {/* PIN */}
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-500 mb-1">PIN code</label>
                <input id="pin" name="pin" type="text" value={form.pin} onChange={handleChange} placeholder="PIN code" ref={refs.pin} className={`w-full h-11 rounded-lg border ${errors.pin ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.pin} aria-describedby={errors.pin ? "pin-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="pin-error">{errors.pin || ""}</div>
              </div>
              {/* City */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-500 mb-1">City</label>
                <input id="city" name="city" type="text" value={form.city} onChange={handleChange} placeholder="City" ref={refs.city} className={`w-full h-11 rounded-lg border ${errors.city ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.city} aria-describedby={errors.city ? "city-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="city-error">{errors.city || ""}</div>
              </div>
              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-500 mb-1">State</label>
                <input id="state" name="state" type="text" value={form.state} onChange={handleChange} placeholder="State" ref={refs.state} className={`w-full h-11 rounded-lg border ${errors.state ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.state} aria-describedby={errors.state ? "state-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="state-error">{errors.state || ""}</div>
              </div>
              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                <input id="country" name="country" type="text" value={form.country} onChange={handleChange} placeholder="Country" ref={refs.country} className={`w-full h-11 rounded-lg border ${errors.country ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`} aria-invalid={!!errors.country} aria-describedby={errors.country ? "country-error" : undefined} />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="country-error">{errors.country || ""}</div>
              </div>
              {/* File Upload (spans 2 cols) */}
              <div className="md:col-span-2">
                <label htmlFor="file" className="block text-sm font-medium text-gray-500 mb-1">Upload copy of registration of firm / company (bearing its registration or concerned partnership)</label>
                <input id="file" name="file" type="file" accept="application/pdf" ref={refs.file} onChange={handleChange} className={`block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#F3F4F6] file:text-[#004AAD] hover:file:bg-[#e5e7eb] ${errors.file ? "border-red-400" : "border-[#E5E7EB]"} border rounded-lg mt-1`} aria-invalid={!!errors.file} aria-describedby={errors.file ? "file-error" : undefined} />
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-xs text-gray-400">Maximum file size: 10 MB; upload PDF only</span>
                  <span className="text-xs text-[#ef4444]">Upload is a must.</span>
                </div>
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="file-error">{errors.file || ""}</div>
              </div>
            </div>
          </div>
          {/* Checkbox */}
          <div className="flex items-start gap-2 mt-2">
            <input id="agree" name="agree" type="checkbox" checked={form.agree} onChange={handleChange} ref={refs.agree} className={`mt-1 accent-[#004AAD] w-4 h-4 rounded focus:ring-2 focus:ring-[#004AAD]/40 border border-[#E5E7EB]`} aria-invalid={!!errors.agree} aria-describedby={errors.agree ? "agree-error" : undefined} />
            <label htmlFor="agree" className="text-sm text-gray-500 select-none">Once you submit this form, our company will contact you shortly.</label>
          </div>
          <div className="min-h-[18px] text-xs text-red-500 mt-1" id="agree-error">{errors.agree || ""}</div>
          {/* Submit Button */}
          <div className="flex flex-col md:flex-row justify-end mt-4">
            <button type="submit" className="w-full md:w-auto px-8 h-12 rounded-full bg-[#004AAD] text-white font-semibold text-base shadow-sm hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-[#004AAD]/50" aria-busy={submitting} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Form"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpAgent;