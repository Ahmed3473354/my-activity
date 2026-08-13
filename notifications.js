// ========================================
// نظام المنبهات والإشعارات
// ========================================

let notificationTimers = [];

let alarmContext = null;
let alarmInterval = null;


// ========================================
// طلب إذن الإشعارات
// ========================================

async function requestNotificationPermission() {

    if (!("Notification" in window)) {

        alert("المتصفح لا يدعم الإشعارات");

        return false;
    }

    if (Notification.permission === "granted") {

        return true;
    }

    const permission =
        await Notification.requestPermission();

    return permission === "granted";
}


// ========================================
// Audio Context
// ========================================

function getAudioContext() {

    if (!alarmContext) {

        alarmContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }

    return alarmContext;
}


// ========================================
// نغمة واحدة
// ========================================

function beep(frequency, duration = 300) {

    const context =
        getAudioContext();

    const oscillator =
        context.createOscillator();

    const gain =
        context.createGain();

    oscillator.type = "sine";

    oscillator.frequency.value =
        frequency;

    gain.gain.setValueAtTime(
        0.001,
        context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.25,
        context.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime +
        duration / 1000
    );

    oscillator.connect(gain);

    gain.connect(
        context.destination
    );

    oscillator.start();

    oscillator.stop(
        context.currentTime +
        duration / 1000
    );
}


// ========================================
// تشغيل المنبه
// ========================================

function playAlarmSound(sound = "default") {

    stopAlarm();

    const context =
        getAudioContext();

    if (context.state === "suspended") {

        context.resume();

    }


    // ==============================
    // هادئ
    // ==============================

    if (sound === "soft") {

        function softAlarm() {

            beep(523, 300);

            setTimeout(
                () => beep(659, 300),
                350
            );

            setTimeout(
                () => beep(784, 400),
                700
            );

        }

        softAlarm();

        alarmInterval =
            setInterval(
                softAlarm,
                2500
            );

        return;
    }


    // ==============================
    // رقمي
    // ==============================

    if (sound === "digital") {

        function digitalAlarm() {

            beep(880, 150);

            setTimeout(
                () => beep(880, 150),
                220
            );

            setTimeout(
                () => beep(660, 300),
                440
            );

        }

        digitalAlarm();

        alarmInterval =
            setInterval(
                digitalAlarm,
                2200
            );

        return;
    }


    // ==============================
    // عادي
    // ==============================

    function defaultAlarm() {

        beep(880, 400);

        setTimeout(
            () => beep(660, 400),
            500
        );

    }

    defaultAlarm();

    alarmInterval =
        setInterval(
            defaultAlarm,
            2200
        );
}


// ========================================
// إيقاف المنبه
// ========================================

function stopAlarm() {

    if (alarmInterval) {

        clearInterval(
            alarmInterval
        );

        alarmInterval = null;
    }
}


// ========================================
// قاعدة بيانات صغيرة للـ Service Worker
// ========================================

function openAlarmDB() {

    return new Promise(
        function (resolve, reject) {

            const request =
                indexedDB.open(
                    "TasksAlarmDB",
                    1
                );


            request.onupgradeneeded =
                function () {

                    const db =
                        request.result;

                    if (
                        !db.objectStoreNames
                            .contains("completed")
                    ) {

                        db.createObjectStore(
                            "completed"
                        );

                    }

                };


            request.onsuccess =
                function () {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                function () {

                    reject(
                        request.error
                    );

                };

        }
    );
}


// ========================================
// تسجيل المهمة كمكتملة
// ========================================

async function markCompletedInDB(id) {

    try {

        const db =
            await openAlarmDB();

        const transaction =
            db.transaction(
                "completed",
                "readwrite"
            );

        transaction
            .objectStore("completed")
            .put(
                true,
                String(id)
            );

    }

    catch (error) {

        console.error(
            "خطأ في حفظ الإكمال:",
            error
        );

    }
}


// ========================================
// إظهار إشعار المهمة
// ========================================

async function showTaskNotification(task) {

    // تشغيل الصوت إذا كانت الصفحة مفتوحة
    playAlarmSound(
        task.alarmSound || "default"
    );


    let priorityText =
        "🟡 مهمة";

    if (task.priority === "high") {

        priorityText =
            "🔴 مهمة جدًا";

    }

    else if (task.priority === "low") {

        priorityText =
            "🟢 عادية";

    }


    // ====================================
    // استخدام Service Worker للإشعار
    // ====================================

    if (
        "serviceWorker" in navigator
    ) {

        try {

            const registration =
                await navigator.serviceWorker.ready;


            await registration.showNotification(
                "🔔 حان وقت المهمة",
                {

                    body:
                        `${task.name}\n` +
                        `⏰ ${task.time} • ${priorityText}`,

                    tag:
                        `task-${task.id}`,

                    requireInteraction:
                        true,

                    icon:
                        "./icon-192.png",

                    badge:
                        "./icon-192.png",

                    data: {

                        taskId:
                            String(task.id)

                    },

                    actions: [

                        {
                            action:
                                "complete",

                            title:
                                "✅ تم"

                        },

                        {
                            action:
                                "snooze",

                            title:
                                "😴 غفوة 5 دقائق"

                        }

                    ]

                }
            );

        }

        catch (error) {

            console.error(
                "فشل إنشاء الإشعار:",
                error
            );

        }

    }


    // ====================================
    // شاشة داخل التطبيق
    // ====================================

    showAlarmScreen(task);
}


// ========================================
// شاشة المنبه داخل التطبيق
// ========================================

function showAlarmScreen(task) {

    const old =
        document.getElementById(
            "alarmScreen"
        );

    if (old) {

        old.remove();

    }


    const screen =
        document.createElement(
            "div"
        );

    screen.id =
        "alarmScreen";


    screen.innerHTML = `

        <div class="alarm-box">

            <div class="alarm-ring">
                🔔
            </div>

            <div class="alarm-title">
                حان وقت المهمة
            </div>

            <div class="alarm-task">
                ${escapeAlarmText(task.name)}
            </div>

            <div class="alarm-time">
                ⏰ ${task.time}
            </div>

            <button
                id="stopAlarmButton"
                class="stop-alarm-button">

                <span class="stop-icon">
                    ■
                </span>

                إيقاف المنبه

            </button>

        </div>

    `;


    document.body.appendChild(
        screen
    );


    const button =
        document.getElementById(
            "stopAlarmButton"
        );


    button.addEventListener(
        "click",
        function () {

            stopAlarm();

            screen.remove();

        }
    );
}


// ========================================
// حماية النص
// ========================================

function escapeAlarmText(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


// ========================================
// جدولة مهمة
// ========================================

function scheduleTaskNotification(task) {

    if (task.completed) {

        return;
    }


    if (!task.date || !task.time) {

        return;
    }


    const taskDate =
        new Date(
            `${task.date}T${task.time}`
        );


    const now =
        new Date();


    const difference =
        taskDate.getTime() -
        now.getTime();


    if (difference > 0) {

        const timer =
            setTimeout(
                function () {

                    showTaskNotification(
                        task
                    );

                },
                difference
            );


        notificationTimers.push(
            timer
        );

    }
}


// ========================================
// تشغيل كل المنبهات
// ========================================

function scheduleAllNotifications() {

    notificationTimers.forEach(
        function (timer) {

            clearTimeout(timer);

        }
    );


    notificationTimers = [];


    if (
        !("Notification" in window)
    ) {

        return;
    }


    if (
        Notification.permission !==
        "granted"
    ) {

        return;
    }


    const tasks =
        JSON.parse(
            localStorage.getItem(
                "tasks"
            )
        ) || [];


    tasks.forEach(
        function (task) {

            scheduleTaskNotification(
                task
            );

        }
    );
}