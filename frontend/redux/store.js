import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import toolsReducer from './slices/toolsSlice';
import userReducer from './slices/userSlice';

import firebaseConfig from '@/firebase/config';

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app);

if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'user'], // Add any other reducers you want to persist
};

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  tools: toolsReducer,
  chat: chatReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

const persistor = persistStore(store);

export { auth, firestore, functions, persistor };
export default store;
