// src/store/hostAuthSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  email: '',
  phone: '',
  role: 'host',
  first_name: '',
  last_name: '',
  profileImage: '',
  id: '',
  hostAccessToken: '',
};

const hostAuthSlice = createSlice({
  name: 'hostAuth',
  initialState,
  reducers: {
    setHostLogin: (state, action) => {
      const {
        email,
        phone,
        first_name,
        last_name,
        profileImage,
        id,
        hostAccessToken
      } = action.payload;

      state.email = email || '';
      state.phone = phone || '';
      state.role = 'host';
      state.first_name = first_name || '';
      state.last_name = last_name || '';
      state.profileImage = profileImage || '';
      state.id = id || '';
      state.hostAccessToken = hostAccessToken || '';
    },

    logoutHost: (state) => {
      return initialState;
    },
  },
});

export const { setHostLogin, logoutHost } = hostAuthSlice.actions;
export default hostAuthSlice.reducer;

