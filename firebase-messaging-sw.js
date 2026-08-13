importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCxGQ09GaiNjfGWuLIgZoapcE8EnV-qJX4",
  authDomain: "story-99788.firebaseapp.com",
  projectId: "story-99788",
  storageBucket: "story-99788.firebasestorage.app",
  messagingSenderId: "128764826759",
  appId: "1:128764826759:web:6bf1df2525f981e44d5422"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

  console.log("📩 Firebase Message:", payload);

  const notificationTitle =
    payload.notification?.title || "⏰ تذكير";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "لديك مهمة حان موعدها",
    icon: "/icon.png"
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

console.log("🔥 Firebase Messaging SW بدأ");