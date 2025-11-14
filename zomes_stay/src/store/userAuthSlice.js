// src/store/userAuthSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  email: '',
  phone: '',
  role: 'user',
  first_name: '',
  last_name: '',
  profileImage: '',
  id: '',
  userAccessToken: '',
};

const userAuthSlice = createSlice({
  name: 'userAuth',
  initialState,
  reducers: {
    setUserLogin: (state, action) => {
      const {
        email,
        phone,
        first_name,
        last_name,
        profileImage,
        id,
        userAccessToken
      } = action.payload;

      state.email = email || '';
      state.phone = phone || '';
      state.role = 'user';
      state.first_name = first_name || '';
      state.last_name = last_name || '';
      state.profileImage = profileImage || '';
      state.id = id || '';
      state.userAccessToken = userAccessToken || '';
    },

    logoutUser: (state) => {
      return initialState;
    },
  },
});

export const { setUserLogin, logoutUser } = userAuthSlice.actions;
export default userAuthSlice.reducer;

