import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import apiClient from "../api/apiclient";

const firebaseConfig = {
  apiKey: "AIzaSyCS-k0xA97LWFEhYZh8tCyllvz734N_Tk8",
  authDomain: "sharaf-stage-dev.firebaseapp.com",
  projectId: "sharaf-stage-dev",
  storageBucket: "sharaf-stage-dev.firebasestorage.app",
  messagingSenderId: "113425308767",
  appId: "1:113425308767:web:ef1335e6af818fa1448fea",
  measurementId: "G-50PX3LXPPG",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

const sendFcmToken = async (token) => {
  try {
    await apiClient.post("/vendor/fcm_token", { device_token: token });
  } catch {
    //
  }
};

 
let tokenPromise = null;

const fetchToken = async () => {
  try {
    const currentPermission = Notification.permission;

    if (currentPermission === "denied") {
      return null;
    }

    if (currentPermission === "default") {
      const newPermission = await Notification.requestPermission();
      if (newPermission !== "granted") {
        return null;
      }
    }

    if (Notification.permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });

      if (token) {
        sendFcmToken(token);
        return token;
      }
    }

    return null;
  } catch (err) {
    console.error("Error getting FCM token", err);
    return null;
  }
};

export const requestForToken = () => {
  if (!tokenPromise) {
    tokenPromise = fetchToken().finally(() => {
       
      tokenPromise = null;
    });
  }
  return tokenPromise;
};

export const onMessageListener = (callback) => {
  const unsubscribe = onMessage(messaging, (payload) => {
    callback(payload);
  });

  return unsubscribe;
};
