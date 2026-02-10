import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBoCVo8e62TO4icrvrIRGA_sR3ggwF3RJ4",
  authDomain: "silksync-89717.firebaseapp.com",
  projectId: "silksync-89717",
  storageBucket: "silksync-89717.firebasestorage.app",
  messagingSenderId: "353421855389",
  appId: "1:353421855389:web:2dc91f1e71ab2bb5c16274",
  measurementId: "G-W3K3MYX8M9"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);