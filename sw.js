// =====================================================
// SW.JS
// Service Worker
// يعمل حتى لو التطبيق مغلق
// =====================================================

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

messaging.onBackgroundMessage(function(payload) {

    console.log(
        "📩 Firebase Message:",
        payload
    );

    const data =
        payload.data || {};

    const title =
        data.title || "🔔 حان وقت المهمة";

    const body =
        data.body || "لديك مهمة الآن.";

    const taskId =
        data.taskId || "";

    self.registration.showNotification(
        title,
        {
            body: body,

            icon: "./icon-192.png",

            badge: "./icon-192.png",

            requireInteraction: true,

            tag: "task-" + taskId,

            data: {
                taskId: taskId
            },

            actions: [
                {
                    action: "complete",
                    title: "✅ تم"
                },
                {
                    action: "snooze",
                    title: "😴 غفوة 5 دقائق"
                }
            ]
        }
    );
});

const DB_NAME = "MyTasksDB";

console.log("🔥 SW بدأ التشغيل");

const DB_VERSION = 1;
const STORE_NAME = "tasks";

console.log("🔥 SW بدأ التشغيل");

// =====================================================
// INSTALL
// =====================================================

self.addEventListener("install", function (event) {

    console.log("Service Worker: install");

    self.skipWaiting();

});

// =====================================================
// ACTIVATE
// =====================================================

self.addEventListener("activate", function (event) {

    console.log("Service Worker: activate");

    event.waitUntil(
        self.clients.claim()
    );

});

// =====================================================
// فتح IndexedDB
// =====================================================

function openDatabase() {

    return new Promise(function (resolve, reject) {

        const request = indexedDB.open(
            DB_NAME,
            DB_VERSION
        );

        request.onupgradeneeded = function (event) {

            const database = event.target.result;

            if (
                !database.objectStoreNames.contains(
                    STORE_NAME
                )
            ) {

                database.createObjectStore(
                    STORE_NAME,
                    {
                        keyPath: "id"
                    }
                );

            }

        };

        request.onsuccess = function () {

            resolve(request.result);

        };

        request.onerror = function () {

            reject(request.error);

        };

    });

}

// =====================================================
// تحويل ID
// =====================================================

function normalizeTaskId(id) {

    if (typeof id === "number") {
        return id;
    }

    if (typeof id === "string") {

        const numberId = Number(id);

        if (Number.isFinite(numberId)) {
            return numberId;
        }

    }

    return id;

}

// =====================================================
// الحصول على المهمة
// =====================================================

async function getTask(id) {

    const database =
        await openDatabase();

    const taskId =
        normalizeTaskId(id);

    return new Promise(function (
        resolve,
        reject
    ) {

        const transaction =
            database.transaction(
                STORE_NAME,
                "readonly"
            );

        const store =
            transaction.objectStore(
                STORE_NAME
            );

        const request =
            store.get(taskId);

        request.onsuccess = function () {

            resolve(
                request.result || null
            );

        };

        request.onerror = function () {

            reject(
                request.error
            );

        };

        transaction.oncomplete = function () {

            database.close();

        };

    });

}

// =====================================================
// تحديث المهمة
// =====================================================

async function updateTask(task) {

    const database =
        await openDatabase();

    return new Promise(function (
        resolve,
        reject
    ) {

        const transaction =
            database.transaction(
                STORE_NAME,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                STORE_NAME
            );

        const request =
            store.put(task);

        request.onsuccess = function () {

            console.log(
                "تم حفظ المهمة:",
                task.id
            );

        };

        request.onerror = function () {

            reject(
                request.error
            );

        };

        transaction.oncomplete = function () {

            database.close();

            resolve(true);

        };

        transaction.onerror = function () {

            database.close();

            reject(
                transaction.error
            );

        };

    });

}

// =====================================================
// إغلاق الإشعار
// =====================================================

function closeNotification(notification) {

    if (notification) {
        notification.close();
    }

}

// =====================================================
// إرسال رسالة للتطبيق إذا كان مفتوحًا
// =====================================================

async function sendMessageToClients(data) {

    const clientsList =
        await self.clients.matchAll({

            type: "window",

            includeUncontrolled: true

        });

    for (const client of clientsList) {

        client.postMessage(data);

    }

}

// =====================================================
// Notification Click
// =====================================================

self.addEventListener(
    "notificationclick",
    function (event) {

        event.waitUntil(
            handleNotificationClick(event)
        );

    }
);

// =====================================================
// معالجة الضغط
// =====================================================

async function handleNotificationClick(event) {

    const notification =
        event.notification;

    const action =
        event.action || "";

    const data =
        notification.data || {};

    const taskId =
        data.taskId;

    console.log(
        "Notification clicked:",
        action,
        taskId
    );

    // =================================================
    // زر تم
    // =================================================

    if (action === "complete") {

        try {

            if (
                taskId === undefined ||
                taskId === null
            ) {

                console.error(
                    "لا يوجد taskId"
                );

                closeNotification(
                    notification
                );

                return;

            }

            // -----------------------------------------
            // الحصول على المهمة من IndexedDB
            // -----------------------------------------

            const task =
                await getTask(taskId);

            if (!task) {

                console.error(
                    "المهمة غير موجودة:",
                    taskId
                );

                closeNotification(
                    notification
                );

                return;

            }

            // -----------------------------------------
            // إكمال المهمة
            // -----------------------------------------

            task.completed = true;

            // -----------------------------------------
            // حفظها في IndexedDB
            // -----------------------------------------

            await updateTask(task);

            console.log(
                "✅ تم إكمال المهمة والتطبيق مغلق:",
                task.id
            );

            // -----------------------------------------
            // إغلاق الإشعار
            // -----------------------------------------

            closeNotification(
                notification
            );

            // -----------------------------------------
            // لو التطبيق مفتوح نرسل له تحديث
            // لو مغلق لا توجد مشكلة
            // -----------------------------------------

            await sendMessageToClients({

                type:
                    "COMPLETE_TASK",

                taskId:
                    task.id

            });

            // -----------------------------------------
            // مهم جدًا:
            // لا openWindow هنا
            // -----------------------------------------

            return;

        }
        catch (error) {

            console.error(
                "❌ خطأ أثناء إكمال المهمة:",
                error
            );

            closeNotification(
                notification
            );

            return;

        }

    }

    // =================================================
    // زر غفوة
    // =================================================

    if (action === "snooze") {

        try {

            if (
                taskId === undefined ||
                taskId === null
            ) {

                closeNotification(
                    notification
                );

                return;

            }

            const task =
                await getTask(taskId);

            if (!task) {

                closeNotification(
                    notification
                );

                return;

            }

            const date =
                new Date();

            date.setMinutes(
                date.getMinutes() + 5
            );

            const year =
                date.getFullYear();

            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");

            const hour =
                String(
                    date.getHours()
                ).padStart(2, "0");

            const minute =
                String(
                    date.getMinutes()
                ).padStart(2, "0");

            task.date =
                `${year}-${month}-${day}`;

            task.time =
                `${hour}:${minute}`;

            task.completed =
                false;

            await updateTask(task);

            console.log(
                "😴 تم تأجيل المهمة 5 دقائق:",
                task.id
            );

            closeNotification(
                notification
            );

            await sendMessageToClients({

                type:
                    "SNOOZE_TASK",

                taskId:
                    task.id

            });

            return;

        }
        catch (error) {

            console.error(
                "❌ خطأ في الغفوة:",
                error
            );

            closeNotification(
                notification
            );

            return;

        }

    }

    // =================================================
    // الضغط على جسم الإشعار
    // =================================================

    closeNotification(
        notification
    );

    await openApp();

}

// =====================================================
// فتح التطبيق
// =====================================================

async function openApp() {

    const clientsList =
        await self.clients.matchAll({

            type: "window",

            includeUncontrolled: true

        });

    // التطبيق مفتوح
    for (const client of clientsList) {

        if ("focus" in client) {

            await client.focus();

            return;

        }

    }

    // التطبيق مغلق
    if (
        "openWindow" in self.clients
    ) {

        try {

            await self.clients.openWindow(
                self.registration.scope
            );

        }
        catch (error) {

            console.error(
                "فشل فتح التطبيق:",
                error
            );

        }

    }

}

// =====================================================
// إغلاق الإشعار
// =====================================================

self.addEventListener(
    "notificationclose",
    function () {

        console.log(
            "تم إغلاق الإشعار"
        );

    }
);

// =====================================================
// استقبال الرسائل من app.js
// =====================================================

self.addEventListener(
    "message",
    function (event) {

        if (!event.data) {
            return;
        }

        console.log(
            "SW message:",
            event.data
        );

    }
);

// =====================================================
// FETCH
// =====================================================

self.addEventListener(
    "fetch",
    function (event) {

        // لا نتدخل في طلبات الموقع

    }
);