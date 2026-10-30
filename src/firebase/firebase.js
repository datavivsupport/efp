import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import apiClient from "../api/apiclient";

const firebaseConfig = {
  apiKey: "AIzaSyAf91oN0vqPJ6VdSVOC6HcRPbds9N2O1Lw",
  authDomain: "ssa-dms-ae967.firebaseapp.com",
  projectId: "ssa-dms-ae967",
  storageBucket: "ssa-dms-ae967.firebasestorage.app",
  messagingSenderId: "49671243737",
  appId: "1:49671243737:web:866242c71e961adc6fbbc8",
  measurementId: "G-8953KKV1DR",
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
