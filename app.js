// =====================================================
// APP.JS
// نظام المهام
// IndexedDB + Service Worker + Firebase
// =====================================================

import {
    app,
    enablePushNotifications,
    firestoreDB
} from "./firebase.js";

async function testFirestore() {
    try {
        const docRef = await addDoc(
            collection(firestoreDB, "test"),
            {
                message: "Firestore works",
                time: Date.now()
            }
        );

        console.log("✅ Firestore يعمل:", docRef.id);

    } catch (error) {
        console.error("❌ Firestore:", error);
    }
}

testFirestore();

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// =====================================================
// IndexedDB
// =====================================================

const DB_NAME = "MyTasksDB";
const DB_VERSION = 1;
const STORE_NAME = "tasks";

let db = null;
let tasks = [];
let currentFilter = "all";


// =====================================================
// فتح قاعدة البيانات
// =====================================================

function openDatabase() {

    return new Promise((resolve, reject) => {

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

            db = request.result;

            db.onversionchange = function () {
                db.close();
            };

            resolve(db);

        };

        request.onerror = function () {

            reject(request.error);

        };

    });

}


// =====================================================
// الحصول على كل المهام
// =====================================================

function getAllTasks() {

    return new Promise((resolve, reject) => {

        if (!db) {

            reject(
                new Error(
                    "قاعدة البيانات غير مفتوحة"
                )
            );

            return;
        }

        const transaction =
            db.transaction(
                STORE_NAME,
                "readonly"
            );

        const store =
            transaction.objectStore(
                STORE_NAME
            );

        const request =
            store.getAll();

        request.onsuccess = function () {

            resolve(
                request.result || []
            );

        };

        request.onerror = function () {

            reject(request.error);

        };

    });

}


// =====================================================
// إضافة / تحديث مهمة
// =====================================================

function putTask(task) {

    return new Promise((resolve, reject) => {

        if (!db) {

            reject(
                new Error(
                    "قاعدة البيانات غير مفتوحة"
                )
            );

            return;
        }

        const transaction =
            db.transaction(
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

            resolve();

        };

        request.onerror = function () {

            reject(request.error);

        };

    });

}


// =====================================================
// حذف مهمة
// =====================================================

function deleteTaskFromDB(id) {

    return new Promise((resolve, reject) => {

        if (!db) {

            reject(
                new Error(
                    "قاعدة البيانات غير مفتوحة"
                )
            );

            return;
        }

        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                STORE_NAME
            );

        const request =
            store.delete(id);

        request.onsuccess = function () {

            resolve();

        };

        request.onerror = function () {

            reject(request.error);

        };

    });

}


// =====================================================
// عناصر الصفحة
// =====================================================

const openAddTask =
    document.getElementById("openAddTask");

const alarmSound =
    document.getElementById("alarmSound");

const taskModal =
    document.getElementById("taskModal");

const closeModal =
    document.getElementById("closeModal");

const addTask =
    document.getElementById("addTask");

const taskName =
    document.getElementById("taskName");

const taskDate =
    document.getElementById("taskDate");

const taskHour =
    document.getElementById("taskHour");

const taskMinute =
    document.getElementById("taskMinute");

const taskPriority =
    document.getElementById("taskPriority");

const taskRepeat =
    document.getElementById("taskRepeat");

const taskNotes =
    document.getElementById("taskNotes");

const tasksList =
    document.getElementById("tasksList");

const searchInput =
    document.getElementById("searchInput");

const totalTasks =
    document.getElementById("totalTasks");

const completedTasks =
    document.getElementById("completedTasks");

const remainingTasks =
    document.getElementById("remainingTasks");

const dayCount =
    document.getElementById("dayCount");

const enableNotifications =
    document.getElementById(
        "enableNotifications"
    );


// =====================================================
// Firebase Push Notifications
// =====================================================

// =====================================================
// Firebase Push Notifications
// =====================================================

if (enableNotifications) {

    enableNotifications.addEventListener("click", async function () {

        console.log("🔥 تم الضغط على زر تفعيل المنبهات");

        enableNotifications.disabled = true;
        enableNotifications.textContent = "⏳ جاري التفعيل...";

        try {

            const token = await enablePushNotifications();

            if (token) {

                localStorage.setItem("fcmToken", token);

                console.log("✅ تم حفظ FCM Token");
                console.log("TOKEN:", token);

                enableNotifications.textContent =
                    "✅ المنبهات مفعلة";

            } else {

                console.log("❌ لم يتم الحصول على Token");

                enableNotifications.disabled = false;
                enableNotifications.textContent =
                    "🔔 تفعيل المنبهات";
            }

        } catch (error) {

            console.error("❌ Firebase:", error);

            enableNotifications.disabled = false;
            enableNotifications.textContent =
                "🔔 تفعيل المنبهات";
        }

    });

}

// =====================================================
// التاريخ
// =====================================================

function getDateString(addDays = 0) {

    const date = new Date();

    date.setDate(
        date.getDate() + addDays
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

    return `${year}-${month}-${day}`;

}


if (taskDate) {

    taskDate.value =
        getDateString();

}


// =====================================================
// الساعات
// =====================================================

if (taskHour) {

    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            String(hour).padStart(2, "0");

        option.textContent =
            String(hour).padStart(2, "0");

        taskHour.appendChild(
            option
        );

    }

}


// =====================================================
// الدقائق
// =====================================================

if (taskMinute) {

    for (
        let minute = 0;
        minute < 60;
        minute++
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            String(minute).padStart(2, "0");

        option.textContent =
            String(minute).padStart(2, "0");

        taskMinute.appendChild(
            option
        );

    }

}


// =====================================================
// فتح نافذة إضافة مهمة
// =====================================================

if (openAddTask) {

    openAddTask.addEventListener(
        "click",
        function () {

            if (!taskModal)
                return;

            taskModal.classList.add(
                "show"
            );

            if (taskName) {

                taskName.focus();

            }

        }
    );

}


// =====================================================
// إغلاق النافذة
// =====================================================

function closeTaskModal() {

    if (!taskModal)
        return;

    taskModal.classList.remove(
        "show"
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeTaskModal
    );

}


if (taskModal) {

    taskModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                taskModal
            ) {

                closeTaskModal();

            }

        }
    );

}


// =====================================================
// تنظيف الحقول
// =====================================================

function clearInputs() {

    if (taskName)
        taskName.value = "";

    if (taskHour)
        taskHour.value = "";

    if (taskMinute)
        taskMinute.value = "";

    if (taskNotes)
        taskNotes.value = "";

    if (alarmSound)
        alarmSound.value = "default";

    if (taskPriority)
        taskPriority.value = "medium";

    if (taskRepeat)
        taskRepeat.value = "none";

    if (taskDate)
        taskDate.value =
            getDateString();

}


// =====================================================
// إرسال رسالة إلى Service Worker
// =====================================================

async function sendMessageToServiceWorker(message) {

    if (
        !("serviceWorker" in navigator)
    ) {

        return false;

    }

    try {

        const registration =
            await navigator.serviceWorker.ready;

        if (!registration.active) {

            return false;

        }

        registration.active.postMessage(
            message
        );

        return true;

    }
    catch (error) {

        console.error(
            "Service Worker Message:",
            error
        );

        return false;

    }

}


// =====================================================
// إضافة مهمة
// =====================================================

if (addTask) {

    addTask.addEventListener(
        "click",
        async function () {

            const name =
                taskName
                ? taskName.value.trim()
                : "";

            const date =
                taskDate
                ? taskDate.value
                : "";

            const hour =
                taskHour
                ? taskHour.value
                : "";

            const minute =
                taskMinute
                ? taskMinute.value
                : "";

            if (!name) {

                alert(
                    "اكتب اسم المهمة أولًا"
                );

                if (taskName)
                    taskName.focus();

                return;

            }

            if (!date) {

                alert(
                    "حدد تاريخ المهمة"
                );

                return;

            }

            if (
                hour === "" ||
                minute === ""
            ) {

                alert(
                    "حدد الساعة والدقائق"
                );

                return;

            }

            const task = {

                id:
                    Date.now() +
                    Math.random(),

                name:
                    name,

                date:
                    date,

                time:
                    `${hour}:${minute}`,

                alarmSound:
                    alarmSound
                    ? alarmSound.value
                    : "default",

                priority:
                    taskPriority
                    ? taskPriority.value
                    : "medium",

                repeat:
                    taskRepeat
                    ? taskRepeat.value
                    : "none",

                notes:
                    taskNotes
                    ? taskNotes.value.trim()
                    : "",

                completed:
                    false,

                createdAt:
                    Date.now()

            };

            try {

                await putTask(
                    task
                );

                await addDoc(
    collection(firestoreDB, "tasks"),
    {
        ...task,
        createdAt: Date.now()
    }
);

                tasks.push(
                    task
                );

                clearInputs();

                closeTaskModal();

                renderTasks();

                await sendMessageToServiceWorker({
                    type: "TASK_UPDATED",
                    task: task
                });

                scheduleNotifications();

            }
            catch (error) {

                console.error(
                    "إضافة المهمة:",
                    error
                );

                alert(
                    "حدث خطأ أثناء حفظ المهمة."
                );

            }

        }
    );

}


// =====================================================
// عرض المهام
// =====================================================

function renderTasks() {

    if (!tasksList)
        return;

    tasksList.innerHTML = "";

    const search =
        searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";

    let filteredTasks =
        tasks.filter(
            function (task) {

                if (
                    search &&
                    !String(task.name)
                        .toLowerCase()
                        .includes(search)
                ) {

                    return false;

                }

                if (
                    currentFilter ===
                    "completed"
                ) {

                    return task.completed;

                }

                if (
                    currentFilter ===
                    "today"
                ) {

                    return (
                        task.date ===
                        getDateString()
                    );

                }

                if (
                    currentFilter ===
                    "tomorrow"
                ) {

                    return (
                        task.date ===
                        getDateString(1)
                    );

                }

                return true;

            }
        );

    filteredTasks.sort(
        function (a, b) {

            const dateA =
                new Date(
                    `${a.date}T${a.time}`
                );

            const dateB =
                new Date(
                    `${b.date}T${b.time}`
                );

            return dateA - dateB;

        }
    );

    if (dayCount) {

        dayCount.textContent =
            `${filteredTasks.length} مهمة`;

    }

    if (
        filteredTasks.length === 0
    ) {

        tasksList.innerHTML = `

            <div class="task">

                <div class="task-info">

                    <div class="task-name">
                        لا توجد مهام هنا 👍
                    </div>

                </div>

            </div>

        `;

        updateStats();

        return;

    }

    filteredTasks.forEach(
        function (task) {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "task" +
                (
                    task.completed
                    ? " completed"
                    : ""
                );

            div.style.borderRightColor =
                getPriorityColor(
                    task.priority
                );

            div.innerHTML = `

                <div class="task-info">

                    <div class="task-name">

                        ${escapeHTML(
                            task.name
                        )}

                    </div>

                    <div class="task-date">

                        📅
                        ${formatDate(
                            task.date
                        )}

                        &nbsp;

                        ⏰
                        ${escapeHTML(
                            task.time
                        )}

                    </div>

                    <div class="task-date">

                        ${getRepeatText(
                            task.repeat
                        )}

                    </div>

                    ${
                        task.notes
                        ?
                        `
                        <div class="task-notes">

                            📝
                            ${escapeHTML(
                                task.notes
                            )}

                        </div>
                        `
                        :
                        ""
                    }

                </div>

                <div class="task-actions">

                    ${
                        task.completed
                        ?
                        `
                        <span>
                            ✅ تم
                        </span>
                        `
                        :
                        `
                        <button
                            class="complete-btn"
                            data-id="${escapeHTML(
                                task.id
                            )}">

                            ✅

                        </button>
                        `
                    }

                    <button
                        class="delete-btn"
                        data-id="${escapeHTML(
                            task.id
                        )}">

                        🗑️

                    </button>

                </div>

            `;

            const completeButton =
                div.querySelector(
                    ".complete-btn"
                );

            if (completeButton) {

                completeButton.addEventListener(
                    "click",
                    function () {

                        completeTask(
                            this.dataset.id
                        );

                    }
                );

            }

            const deleteButton =
                div.querySelector(
                    ".delete-btn"
                );

            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    function () {

                        deleteTask(
                            this.dataset.id
                        );

                    }
                );

            }

            tasksList.appendChild(
                div
            );

        }
    );

    updateStats();

}


// =====================================================
// إكمال المهمة
// =====================================================

async function completeTask(id) {

    const task =
        tasks.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(id)
                );

            }
        );

    if (!task)
        return;

    task.completed = true;

    try {

        await putTask(
            task
        );

        if (
            typeof stopAlarm ===
            "function"
        ) {

            stopAlarm();

        }

        const alarmScreen =
            document.getElementById(
                "alarmScreen"
            );

        if (alarmScreen) {

            alarmScreen.remove();

        }

        renderTasks();

        scheduleNotifications();

        await sendMessageToServiceWorker({
            type: "TASK_UPDATED",
            task: task
        });

    }
    catch (error) {

        console.error(
            "إكمال المهمة:",
            error
        );

    }

}


// =====================================================
// حذف المهمة
// =====================================================

async function deleteTask(id) {

    const confirmed =
        confirm(
            "هل تريد حذف هذه المهمة؟"
        );

    if (!confirmed)
        return;

    try {

        await deleteTaskFromDB(
            id
        );

        tasks =
            tasks.filter(
                function (task) {

                    return (
                        String(task.id) !==
                        String(id)
                    );

                }
            );

        renderTasks();

        scheduleNotifications();

        await sendMessageToServiceWorker({
            type: "TASK_DELETED",
            taskId: id
        });

    }
    catch (error) {

        console.error(
            "حذف المهمة:",
            error
        );

    }

}


// =====================================================
// الإحصائيات
// =====================================================

function updateStats() {

    const total =
        tasks.length;

    const completed =
        tasks.filter(
            function (task) {

                return task.completed;

            }
        ).length;

    const remaining =
        total -
        completed;

    if (totalTasks) {

        totalTasks.textContent =
            total;

    }

    if (completedTasks) {

        completedTasks.textContent =
            completed;

    }

    if (remainingTasks) {

        remainingTasks.textContent =
            remaining;

    }

}


// =====================================================
// الأولوية
// =====================================================

function getPriorityColor(priority) {

    if (
        priority === "high"
    ) {

        return "#ef4444";

    }

    if (
        priority === "medium"
    ) {

        return "#eab308";

    }

    return "#22c55e";

}


// =====================================================
// التكرار
// =====================================================

function getRepeatText(repeat) {

    if (
        repeat === "daily"
    ) {

        return "🔁 يوميًا";

    }

    if (
        repeat === "weekly"
    ) {

        return "🔁 أسبوعيًا";

    }

    if (
        repeat === "monthly"
    ) {

        return "🔁 شهريًا";

    }

    return "📌 مرة واحدة";

}


// =====================================================
// تنسيق التاريخ
// =====================================================

function formatDate(date) {

    const parts =
        String(date).split("-");

    if (
        parts.length !== 3
    ) {

        return date;

    }

    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );

}


// =====================================================
// حماية HTML
// =====================================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(text);

    return div.innerHTML;

}


// =====================================================
// الفلاتر
// =====================================================

document
    .querySelectorAll(".filter")
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            ".filter"
                        )
                        .forEach(
                            function (btn) {

                                btn.classList.remove(
                                    "active"
                                );

                            }
                        );

                    this.classList.add(
                        "active"
                    );

                    currentFilter =
                        this.dataset.filter;

                    renderTasks();

                }
            );

        }
    );


// =====================================================
// البحث
// =====================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderTasks
    );

}


// =====================================================
// الساعة
// =====================================================

function updateClock() {

    const now =
        new Date();

    let hours =
        now.getHours();

    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    const seconds =
        String(
            now.getSeconds()
        ).padStart(2, "0");

    const period =
        hours >= 12
        ? "PM"
        : "AM";

    hours =
        hours % 12 || 12;

    hours =
        String(hours)
            .padStart(2, "0");

    const currentTime =
        document.getElementById(
            "currentTime"
        );

    const currentDate =
        document.getElementById(
            "currentDate"
        );

    if (currentTime) {

        currentTime.textContent =
            `${hours}:${minutes}:${seconds} ${period}`;

    }

    if (currentDate) {

        currentDate.textContent =
            now.toLocaleDateString(
                "ar-EG",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

    }

}

updateClock();

setInterval(
    updateClock,
    1000
);


// =====================================================
// إشعارات الصفحة عندما تكون مفتوحة
// =====================================================

let notificationTimers = [];

function scheduleNotifications() {

    notificationTimers.forEach(
        function (timer) {

            clearTimeout(timer);

        }
    );

    notificationTimers = [];

    tasks.forEach(
        function (task) {

            if (task.completed)
                return;

            if (
                !task.date ||
                !task.time
            )
                return;

            const target =
                new Date(
                    `${task.date}T${task.time}`
                );

            const now =
                new Date();

            const difference =
                target.getTime() -
                now.getTime();

            if (
                difference <= 0
            ) {

                return;

            }

            /*
             * setTimeout له حد أقصى تقريبي.
             * لذلك نستخدمه فقط للمهام القريبة.
             */

            const MAX_TIMEOUT =
                2147483647;

            if (
                difference >
                MAX_TIMEOUT
            ) {

                return;

            }

            const timer =
                setTimeout(
                    function () {

                        if (
                            typeof showTaskNotification ===
                            "function"
                        ) {

                            showTaskNotification(
                                task
                            );

                        }

                    },
                    difference
                );

            notificationTimers.push(
                timer
            );

        }
    );

}


// =====================================================
// Service Worker
// =====================================================

let serviceWorkerRegistration =
    null;


// =====================================================
// تسجيل Service Worker
// =====================================================

async function registerServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {

        console.error(
            "Service Worker غير مدعوم"
        );

        return null;

    }

    /*
     * Service Worker يعمل فقط على HTTPS
     * أو localhost.
     */

    if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
    ) {

        console.warn(
            "Service Worker يحتاج HTTPS أو localhost"
        );

    }

    try {

        serviceWorkerRegistration =
            await navigator.serviceWorker.register(
                "./sw.js",
                {
                    scope: "./"
                }
            );

        console.log(
            "Service Worker تم تسجيله:",
            serviceWorkerRegistration.scope
        );

        await navigator.serviceWorker.ready;

        console.log(
            "Service Worker جاهز"
        );

        return serviceWorkerRegistration;

    }
    catch (error) {

        console.error(
            "فشل تسجيل Service Worker:",
            error
        );

        return null;

    }

}


// =====================================================
// استقبال رسائل Service Worker
// =====================================================

if (
    "serviceWorker" in navigator
) {

    navigator.serviceWorker.addEventListener(
        "message",
        async function (event) {

            const data =
                event.data;

            if (!data)
                return;


            // =========================================
            // إكمال مهمة
            // =========================================

            if (
                data.type ===
                "COMPLETE_TASK"
            ) {

                await completeTask(
                    data.taskId
                );

                return;

            }


            // =========================================
            // غفوة
            // =========================================

            if (
                data.type ===
                "SNOOZE_TASK"
            ) {

                await snoozeTask(
                    data.taskId
                );

                return;

            }


            // =========================================
            // تحديث المهام
            // =========================================

            if (
                data.type ===
                "TASK_CHANGED"
            ) {

                try {

                    tasks =
                        await getAllTasks();

                    renderTasks();

                    scheduleNotifications();

                }
                catch (error) {

                    console.error(
                        "تحديث المهام:",
                        error
                    );

                }

            }

        }
    );

}


// =====================================================
// غفوة 5 دقائق
// =====================================================

async function snoozeTask(id) {

    const task =
        tasks.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(id)
                );

            }
        );

    if (!task)
        return;

    const now =
        new Date();

    now.setMinutes(
        now.getMinutes() + 5
    );

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    const hour =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minute =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    task.date =
        `${year}-${month}-${day}`;

    task.time =
        `${hour}:${minute}`;

    task.completed =
        false;

    try {

        await putTask(
            task
        );

        if (
            typeof stopAlarm ===
            "function"
        ) {

            stopAlarm();

        }

        const alarmScreen =
            document.getElementById(
                "alarmScreen"
            );

        if (alarmScreen) {

            alarmScreen.remove();

        }

        renderTasks();

        scheduleNotifications();

        await sendMessageToServiceWorker({
            type: "TASK_UPDATED",
            task: task
        });

    }
    catch (error) {

        console.error(
            "غفوة المهمة:",
            error
        );

    }

}


// =====================================================
// تحميل المهام
// =====================================================

async function loadTasks() {

    tasks =
        await getAllTasks();

    renderTasks();

    scheduleNotifications();

}


// =====================================================
// تشغيل التطبيق
// =====================================================

async function startApp() {

    try {

        await openDatabase();

        await registerServiceWorker();

        await loadTasks();

        console.log(
            "✅ تم تشغيل التطبيق بنجاح"
        );

    }
    catch (error) {

        console.error(
            "خطأ أثناء تشغيل التطبيق:",
            error
        );

        alert(
            "حدث خطأ أثناء تشغيل التطبيق."
        );

    }

}


// =====================================================
// بدء التطبيق
// =====================================================

startApp();