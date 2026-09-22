importScripts(
  "https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCS-k0xA97LWFEhYZh8tCyllvz734N_Tk8",
  authDomain: "sharaf-stage-dev.firebaseapp.com",
  projectId: "sharaf-stage-dev",
  storageBucket: "sharaf-stage-dev.firebasestorage.app",
  messagingSenderId: "113425308767",
  appId: "1:113425308767:web:ef1335e6af818fa1448fea",
  measurementId: "G-50PX3LXPPG",
});

const messaging = firebase.messaging();

// An account can hold more than one FCM token, so the same event is delivered
// as several identical pushes. Tagging each notification with a stable key
// makes the browser collapse them into one instead of stacking duplicates.
const notificationTag = (payload) => {
  const data = payload?.data || {};
  const notif = payload?.notification || {};

  return (
    data.notification_id ||
    [
      data.sales_input_id || "",
      notif.title || data.title || "",
      notif.body || data.body || "",
    ].join("|")
  );
};

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title;
  if (!title) return;

  self.registration.showNotification(title, {
    body: payload?.notification?.body || payload?.data?.body || "",
    icon: "/sharaf.png",
    data: payload?.data,
    tag: notificationTag(payload),
    renotify: false,
  });
});

self.addEventListener("notificationclick", (event) => {
  // console.log("Notification clicked:", event);

  event.notification.close();

  const urlToOpen =
    event.notification.data?.VIEW_INVOICE_URL ||
    "https://sharaf.theoceann.com";

  event.waitUntil(clients.openWindow(urlToOpen));
});
