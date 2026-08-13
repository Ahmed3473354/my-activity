import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getMessaging,
    getToken
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js";



import {
    getFirestore,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ================================
// Firebase Config
// ================================

const firebaseConfig = {

    apiKey: "AIzaSyCxGQ09GaiNjfGWuLIgZoapcE8EnV-qJX4",

    authDomain: "story-99788.firebaseapp.com",

    projectId: "story-99788",

    storageBucket: "story-99788.firebasestorage.app",

    messagingSenderId: "128764826759",

    appId: "1:128764826759:web:6bf1df2525f981e44d5422",

    measurementId: "G-SMG01TMZR5"
};


// ================================
// تشغيل Firebase
// ================================

const app =
    initializeApp(firebaseConfig);

    const firestoreDB = getFirestore(app);

console.log("✅ Firestore جاهز");


// ================================
// Messaging
// ================================

let messaging = null;


// ================================
// تفعيل الإشعارات
// ================================

async function enablePushNotifications() {
    try {
        if (!("Notification" in window)) {
            alert("المتصفح لا يدعم الإشعارات.");
            return null;
        }

        if (!("serviceWorker" in navigator)) {
            alert("المتصفح لا يدعم Service Worker.");
            return null;
        }

        // لازم الزر هو اللي يستدعي الدالة
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            console.log("❌ إذن الإشعارات غير مسموح");
            return null;
        }

        // الحصول على Service Worker الموجود
        const registration =
            await navigator.serviceWorker.getRegistration("./");

        if (!registration) {
            console.error("❌ Service Worker غير موجود");
            return null;
        }

        console.log("✅ Service Worker موجود:", registration);

        // Firebase Messaging
        const messaging = getMessaging(app);

        console.log("✅ Firebase Messaging جاهز");

        // الحصول على Token مرة واحدة فقط
        const token = await getToken(
            messaging,
            {
                vapidKey:
                    "BD0ibIJ2HN05_4a2KP89gVJ91UXGBc8RzSBDQvVY0_pypXNG6nMbq_pGrAKQd2LPNLdutpSilQAv-67tfvxWdto",

                serviceWorkerRegistration:
                    registration
            }
        );

        if (!token) {
            console.error("❌ لم يتم الحصول على FCM Token");
            return null;
        }

        console.log("✅ FCM TOKEN:", token);

      localStorage.setItem(
    "fcmToken",
    token
);

await setDoc(
    doc(firestoreDB, "notificationTokens", token),
    {
        token: token,
        createdAt: Date.now()
    }
);

console.log("✅ تم حفظ FCM Token في Firestore");

        return token;

    } catch (error) {

        console.error(
            "❌ خطأ Firebase Messaging:",
            error
        );

        return null;
    }
}

export {
    app,
    enablePushNotifications
};
export { firestoreDB };