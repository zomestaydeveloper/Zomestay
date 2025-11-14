// src/StateManagement/store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage'; // localStorage
import { persistReducer, persistStore } from 'redux-persist';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

import adminAuthReducer from './adminAuthSlice';
import hostAuthReducer from './hostAuthSlice';
import userAuthReducer from './userAuthSlice';
import agentAuthReducer from './agentAuthSlice';
import propertyReducer from './propertySlice';

// Separate persist configurations for each auth slice
// This allows each role's data to be persisted independently
const adminAuthPersistConfig = {
  key: 'adminAuth',
  storage,
  // Only persist adminAuth slice separately
};

const hostAuthPersistConfig = {
  key: 'hostAuth',
  storage,
  // Only persist hostAuth slice separately
};

const userAuthPersistConfig = {
  key: 'userAuth',
  storage,
  // Only persist userAuth slice separately
};

const agentAuthPersistConfig = {
  key: 'agentAuth',
  storage,
  // Only persist agentAuth slice separately
};

const propertyPersistConfig = {
  key: 'property',
  storage,
  // Persist property slice separately
};

// Apply persistence to each reducer individually (nested persist)
// This creates separate localStorage keys for each slice:
// - 'persist:adminAuth'
// - 'persist:hostAuth'
// - 'persist:userAuth'
// - 'persist:agentAuth'
// - 'persist:property'
const persistedAdminAuthReducer = persistReducer(adminAuthPersistConfig, adminAuthReducer);
const persistedHostAuthReducer = persistReducer(hostAuthPersistConfig, hostAuthReducer);
const persistedUserAuthReducer = persistReducer(userAuthPersistConfig, userAuthReducer);
const persistedAgentAuthReducer = persistReducer(agentAuthPersistConfig, agentAuthReducer);
const persistedPropertyReducer = persistReducer(propertyPersistConfig, propertyReducer);

// Combine all persisted reducers
// Each slice now has its own localStorage key and can be managed independently
const rootReducer = combineReducers({
  adminAuth: persistedAdminAuthReducer,
  hostAuth: persistedHostAuthReducer,
  userAuth: persistedUserAuthReducer,
  agentAuth: persistedAgentAuthReducer,
  property: persistedPropertyReducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export default store;
