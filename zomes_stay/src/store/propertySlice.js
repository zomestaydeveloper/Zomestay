// in propertySlice.js

import {createSlice} from '@reduxjs/toolkit';

const propertySlice = createSlice({
    name: 'property',
    initialState: { property: null },
    reducers: {
      setHostProperty: (state, action) => {
        state.property = action.payload;
      }
    }
  });
  export const { setHostProperty } = propertySlice.actions;
  export default propertySlice.reducer;