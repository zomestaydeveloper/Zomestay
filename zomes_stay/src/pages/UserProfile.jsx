import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import userService from "../services/user/userService.js";

const UserProfile = () => {
  const navigate = useNavigate();
  const { userAccessToken, id: userId } = useSelector((state) => state.userAuth);
  
  const [user, setUser] = useState({
    id: "",
    name: "",
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    profileImage: "",
    emailVerified: false,
    phoneVerified: false,
    joined: null,
    city: "",
    state: "",
    country: "",
    zip: "",
  });
  
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    city: "",
    state: "",
    country: "",
    zip: "",
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Check authentication
  useEffect(() => {
    if (!userAccessToken || !userId) {
      navigate("/app/login");
      return;
    }
  }, [userAccessToken, userId, navigate]);

  // Fetch user profile on mount
  useEffect(() => {
    if (userAccessToken && userId) {
      fetchUserProfile();
    }
  }, [userAccessToken, userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();
      
      if (response.data.success && response.data.data) {
        const profileData = response.data.data;
        
        // Format user data
        const userData = {
          id: profileData.id,
          name: profileData.name || `${profileData.firstname || ""} ${profileData.lastname || ""}`.trim() || "User",
          firstname: profileData.firstname || "",
          lastname: profileData.lastname || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          profileImage: profileData.profileImage || "",
          emailVerified: profileData.emailVerified || false,
          phoneVerified: profileData.phoneVerified || false,
          joined: profileData.joined || new Date(profileData.createdAt).getFullYear(),
          city: profileData.city || "",
          state: profileData.state || "",
          country: profileData.country || "",
          zip: profileData.zipcode || "",
        };
        
        setUser(userData);
        setForm({
          firstname: userData.firstname,
          lastname: userData.lastname,
          city: userData.city,
          state: userData.state,
          country: userData.country,
          zip: userData.zip,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to load profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({
          type: "error",
          text: "Please select an image file (jpg, png, etc.)",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({
          type: "error",
          text: "Image size should be less than 5MB",
        });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload image immediately
      handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      setMessage({ type: "", text: "" });

      const formData = new FormData();
      formData.append('profileImage', file);
      
      // Also include other profile data if needed
      formData.append('firstname', form.firstname || '');
      formData.append('lastname', form.lastname || '');
      formData.append('city', form.city || '');
      formData.append('state', form.state || '');
      formData.append('country', form.country || '');
      formData.append('zipcode', form.zip || '');

      const response = await userService.updateProfileWithImage(formData);
      
      if (response.data.success && response.data.data) {
        const updatedData = response.data.data;
        
        // Update user state with new image
        setUser({
          ...user,
          profileImage: updatedData.profileImage || "",
          name: updatedData.name || `${updatedData.firstname || ""} ${updatedData.lastname || ""}`.trim() || "User",
          city: updatedData.city || "",
          state: updatedData.state || "",
          country: updatedData.country || "",
          zip: updatedData.zipcode || "",
        });
        
        setMessage({
          type: "success",
          text: "Profile image updated successfully!",
        });
        
        // Clear preview and selected image after successful upload
        setSelectedImage(null);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to upload image. Please try again.",
      });
      // Reset preview on error
      setImagePreview(null);
      setSelectedImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validate fields
    let errs = {};
    if (!form.firstname.trim() && !form.lastname.trim()) {
      errs.firstname = "First name or last name is required";
    }
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      
      // Prepare update data
      const updateData = {
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        zipcode: form.zip.trim() || null,
      };

      const response = await userService.updateProfile(updateData);
      
      if (response.data.success && response.data.data) {
        const updatedData = response.data.data;
        
        // Update user state
        setUser({
          ...user,
          name: updatedData.name || `${updatedData.firstname || ""} ${updatedData.lastname || ""}`.trim() || "User",
          firstname: updatedData.firstname || "",
          lastname: updatedData.lastname || "",
          city: updatedData.city || "",
          state: updatedData.state || "",
          country: updatedData.country || "",
          zip: updatedData.zipcode || "",
        });
        
        setMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to user's current data
    setForm({
      firstname: user.firstname,
      lastname: user.lastname,
      city: user.city,
      state: user.state,
      country: user.country,
      zip: user.zip,
    });
    setErrors({});
    setMessage({ type: "", text: "" });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004AAD] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-white rounded-2xl shadow-lg flex flex-col md:flex-row gap-8 p-4 md:p-8 lg:p-10 max-w-6xl mx-auto mt-6 my-6 border border-gray-200">
      {/* Sidebar */}
      <aside className="w-full md:w-[320px] flex-shrink-0 bg-[#004AAD] text-white rounded-2xl flex flex-col items-center py-8 px-6 gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-[104px] h-[104px] rounded-full bg-white flex items-center justify-center text-[#004AAD] text-5xl font-bold mb-2 overflow-hidden relative">
            {(imagePreview || user.profileImage) ? (
              <img 
                src={imagePreview || (user.profileImage?.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`)}
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const svg = e.target.parentElement.querySelector('svg');
                  if (svg) svg.style.display = 'block';
                }}
              />
            ) : null}
            <svg 
              width="56" 
              height="56" 
              fill="none" 
              viewBox="0 0 24 24"
              style={{ display: (imagePreview || user.profileImage) ? 'none' : 'block' }}
            >
              <circle cx="12" cy="8" r="4" fill="#E5E7EB"/>
              <path d="M4 20c0-3.314 3.134-6 8-6s8 2.686 8 6" fill="#E5E7EB"/>
            </svg>
            {uploadingImage && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <label className="text-xs font-medium underline underline-offset-2 hover:text-blue-100 focus:outline-none cursor-pointer">
            {uploadingImage ? 'Uploading...' : 'Upload a Photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
        </div>
        <div className="flex flex-col items-start gap-1 mt-2">
          <span className="text-lg font-bold">{user.name || "User"}</span>
          {user.phone && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="inline-block" width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="1.5" d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-13Z"/><path stroke="#fff" strokeWidth="1.5" d="M7 8h10M7 12h7m-7 4h4"/></svg>
              {user.phone}
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="inline-block" width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="1.5" d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"/><path stroke="#fff" strokeWidth="1.5" d="M22 6.5 12 13 2 6.5"/></svg>
              {user.email}
            </div>
          )}
          {(user.city || user.state || user.country) && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="inline-block" width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="1.5" d="M12 2C7.03 2 3 6.03 3 11c0 5.25 7.5 11 9 11s9-5.75 9-11c0-4.97-4.03-9-9-9Zm0 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>
              {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'Location not set'}
            </div>
          )}
        </div>
        <div className="w-full border-t border-white/20 my-4"></div>
        <div className="w-full">
          <div className="text-sm font-semibold mb-2">Identity Verification</div>
          <ul className="flex flex-col gap-1 text-sm">
            <li className="flex items-center gap-2">
              {user.emailVerified ? (
                <span className="text-green-300">✔</span>
              ) : (
                <span className="text-yellow-300">⚠</span>
              )}
              {user.emailVerified ? "Email Confirmed" : "Email Not Confirmed"}
            </li>
            <li className="flex items-center gap-2">
              {user.phoneVerified ? (
                <span className="text-green-300">✔</span>
              ) : (
                <span className="text-yellow-300">⚠</span>
              )}
              {user.phoneVerified ? "Mobile Confirmed" : "Mobile Not Confirmed"}
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content: Editable Form */}
      <main className="flex-1 flex flex-col gap-8">
        <header className="mb-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-600">Hello, {user.name || "User"}</h1>
          {user.joined && <div className="text-gray-400 text-sm">Joined in {user.joined}</div>}
        </header>
        
        {/* Message Display */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <form className="flex-1 flex flex-col gap-6" onSubmit={handleSave} autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstname" className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
              <input
                id="firstname"
                name="firstname"
                type="text"
                value={form.firstname}
                onChange={handleChange}
                className={`w-full h-10 rounded-lg border ${errors.firstname ? "border-red-400" : "border-gray-200"} px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`}
                placeholder="First Name"
                aria-invalid={!!errors.firstname}
                aria-describedby={errors.firstname ? "firstname-error" : undefined}
              />
              {errors.firstname && <div id="firstname-error" className="text-xs text-red-500 mt-1">{errors.firstname}</div>}
            </div>
            {/* Last Name */}
            <div>
              <label htmlFor="lastname" className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
              <input
                id="lastname"
                name="lastname"
                type="text"
                value={form.lastname}
                onChange={handleChange}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="Last Name"
              />
            </div>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-1">Mail ID</label>
              <input
                id="email"
                name="email"
                type="email"
                value={user.email || ""}
                disabled
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-400 bg-gray-100 placeholder-gray-400 cursor-not-allowed text-base"
                placeholder="userstest@gmail.com"
              />
            </div>
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={user.phone || ""}
                disabled
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-400 bg-gray-100 placeholder-gray-400 cursor-not-allowed text-base"
                placeholder="+91 123 456 7890"
              />
            </div>
            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-500 mb-1">City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="City Name"
              />
            </div>
            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-500 mb-1">State</label>
              <input
                id="state"
                name="state"
                type="text"
                value={form.state}
                onChange={handleChange}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="State Name"
              />
            </div>
            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-500 mb-1">Country</label>
              <input
                id="country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="Country Name"
              />
            </div>
            {/* Zip Code */}
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-500 mb-1">Zip Code</label>
              <input
                id="zip"
                name="zip"
                type="text"
                value={form.zip}
                onChange={handleChange}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base"
                placeholder="Code"
              />
            </div>
          </div>
            {/* Actions */}
          <div className="flex flex-col md:flex-row gap-3 justify-end items-center mt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto rounded-full bg-[#004AAD] text-white font-semibold px-8 py-3 text-base shadow hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-[#004AAD]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default UserProfile;