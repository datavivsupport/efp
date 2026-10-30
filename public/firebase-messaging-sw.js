importScripts(
  "https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAf91oN0vqPJ6VdSVOC6HcRPbds9N2O1Lw",
  authDomain: "ssa-dms-ae967.firebaseapp.com",
  projectId: "ssa-dms-ae967",
  storageBucket: "ssa-dms-ae967.firebasestorage.app",
  messagingSenderId: "49671243737",
  appId: "1:49671243737:web:866242c71e961adc6fbbc8",
  measurementId: "G-8953KKV1DR",
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

// FCM auto-displayed notifications keep the message payload under data.FCM_MSG,
// while notifications shown by our own code carry the data at the top level.
const getNotificationPath = (notification) => {
  const data = notification.data?.FCM_MSG?.data || notification.data || {};
  return data.sales_input_id
    ? `/approval?id=${encodeURIComponent(data.sales_input_id)}`
    : "/dashboard";
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path = getNotificationPath(event.notification);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const openClient = windowClients.find((client) =>
          client.url.startsWith(self.location.origin),
        );

        // Reuse an open tab: the app routes to the page itself (no reload)
        if (openClient) {
          openClient.postMessage({ type: "NOTIFICATION_CLICK", path });
          return openClient.focus();
        }

        return clients.openWindow(new URL(path, self.location.origin).href);
      }),
  );
});
