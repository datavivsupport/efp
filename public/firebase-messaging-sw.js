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
// messaging.onBackgroundMessage(function (payload) {
//   console.log("Background message received:", payload);

//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: "./sharaf.png",
//     data: payload.data
//   };
//   console.log(notificationTitle,notificationOptions)

//   self.registration.showNotification(notificationTitle, notificationOptions);
// });

self.addEventListener("notificationclick", (event) => {
  // console.log("Notification clicked:", event);

  event.notification.close();

  const urlToOpen =
    event.notification.data?.VIEW_INVOICE_URL ||
    "https://sharaf.theoceann.com";

  event.waitUntil(clients.openWindow(urlToOpen));
});
