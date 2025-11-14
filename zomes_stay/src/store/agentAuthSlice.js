// src/store/agentAuthSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  email: '',
  phone: '',
  first_name: '',
  last_name: '',
  profileImage: '',
  id: '',
  agentAccessToken: '',
  role: '',
  agencyName: '',
  licenseNumber: '',
  officeAddress: ''
};

const agentAuthSlice = createSlice({
  name: 'agentAuth',
  initialState,
  reducers: {
    setAgentLogin: (state, action) => {
      const {
        email,
        phone,
        first_name,
        last_name,
        profileImage,
        id,
        agentAccessToken,
        role,
        agencyName,
        licenseNumber,
        officeAddress
      } = action.payload;

      state.email = email || '';
      state.phone = phone || '';
      state.first_name = first_name || '';
      state.last_name = last_name || '';
      state.profileImage = profileImage || '';
      state.id = id || '';
      state.agentAccessToken = agentAccessToken || '';
      state.role = role || '';
      state.agencyName = agencyName || '';
      state.licenseNumber = licenseNumber || '';
      state.officeAddress = officeAddress || '';
    },

    logoutAgent: (state) => {
      // Clear on logout
      return initialState;
    },
  },
});

export const { setAgentLogin, logoutAgent } = agentAuthSlice.actions;
export default agentAuthSlice.reducer;
