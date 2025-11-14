// src/store/adminAuthSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  email: '',
  phone: '',
  role: 'admin',
  first_name: '',
  last_name: '',
  profileImage: '',
  id: '',
  adminAccessToken: '',
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    setAdminLogin: (state, action) => {
      const {
        email,
        phone,
        first_name,
        last_name,
        profileImage,
        id,
        adminAccessToken
      } = action.payload;

      state.email = email || '';
      state.phone = phone || '';
      state.role = 'admin';
      state.first_name = first_name || '';
      state.last_name = last_name || '';
      state.profileImage = profileImage || '';
      state.id = id || '';
      state.adminAccessToken = adminAccessToken || '';
    },

    logoutAdmin: (state) => {
      return initialState;
    },
  },
});

export const { setAdminLogin, logoutAdmin } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;

