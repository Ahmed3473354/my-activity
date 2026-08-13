
const admin = require("firebase-admin");

// =====================================================
// Firebase Admin
// =====================================================

const serviceAccount =
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


// =====================================================
// إرسال الإشعار
// =====================================================

async function sendNotification(tokens, task) {

    if (tokens.length === 0) {

        console.log("❌ لا توجد أجهزة مسجلة");

        return false;
    }

    const message = {
        tokens: tokens,

        data: {
            title: "🔔 حان وقت المهمة",
            body: task.name || "لديك مهمة الآن",
            taskId: String(task.id || "")
        }
    };

    try {

        const response =
            await admin
                .messaging()
                .sendEachForMulticast(message);

        console.log(
            "📨 تم إرسال " +
            response.successCount +
            " إشعار"
        );

        console.log(
            "❌ فشل إرسال " +
            response.failureCount +
            " إشعار"
        );

        return response.successCount > 0;

    }
    catch (error) {

        console.error(
            "❌ خطأ أثناء إرسال الإشعار:",
            error
        );

        return false;
    }
}


// =====================================================
// الوقت الحالي في مصر
// =====================================================

function getEgyptNow() {

    const now = new Date();

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Africa/Cairo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        ).formatToParts(now);

    function get(type) {

        const item =
            parts.find(
                function (part) {
                    return part.type === type;
                }
            );

        return item
            ? item.value
            : "";
    }

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute")
    };
}


// =====================================================
// تحويل وقت المهمة إلى دقائق
// =====================================================

function getTaskTimeInMinutes(task) {

    if (!task.date || !task.time) {
        return null;
    }

    const now =
        getEgyptNow();

    const taskDate =
        task.date.split("-");

    const taskTime =
        task.time.split(":");

    if (
        taskDate.length !== 3 ||
        taskTime.length !== 2
    ) {

        return null;
    }

    const taskYear =
        Number(taskDate[0]);

    const taskMonth =
        Number(taskDate[1]);

    const taskDay =
        Number(taskDate[2]);

    const taskHour =
        Number(taskTime[0]);

    const taskMinute =
        Number(taskTime[1]);

    const currentYear =
        Number(now.year);

    const currentMonth =
        Number(now.month);

    const currentDay =
        Number(now.day);

    const currentHour =
        Number(now.hour);

    const currentMinute =
        Number(now.minute);


    const taskDateObject =
        Date.UTC(
            taskYear,
            taskMonth - 1,
            taskDay,
            taskHour,
            taskMinute
        );

    const currentDateObject =
        Date.UTC(
            currentYear,
            currentMonth - 1,
            currentDay,
            currentHour,
            currentMinute
        );

    return {
        difference:
            (
                currentDateObject -
                taskDateObject
            ) / 60000
    };
}


// =====================================================
// فحص المهام
// =====================================================

async function checkTasks() {

    try {

        const egyptNow =
            getEgyptNow();

        console.log(
            "🕐 الوقت الحالي في مصر: " +
            egyptNow.year +
            "-" +
            egyptNow.month +
            "-" +
            egyptNow.day +
            " " +
            egyptNow.hour +
            ":" +
            egyptNow.minute
        );


        // =============================================
        // قراءة المهام
        // =============================================

        const snapshot =
            await db
                .collection("tasks")
                .get();

        console.log(
            "📋 عدد المهام: " +
            snapshot.size
        );


        // =============================================
        // قراءة الأجهزة
        // =============================================

        const tokenSnapshot =
            await db
                .collection("notificationTokens")
                .get();

        const tokens = [];

        tokenSnapshot.forEach(
            function (doc) {

                const data =
                    doc.data();

                if (data.token) {

                    tokens.push(
                        data.token
                    );
                }
            }
        );

        console.log(
            "📱 عدد الأجهزة: " +
            tokens.length
        );


        // =============================================
        // فحص المهام
        // =============================================

        for (
            const doc of snapshot.docs
        ) {

            const task =
                doc.data();

            console.log(
                "🔔 مهمة:",
                task.name,
                "|",
                task.date,
                "|",
                task.time
            );


            // =========================================
            // المهمة مكتملة
            // =========================================

            if (
                task.completed === true
            ) {

                continue;
            }


            // =========================================
            // بيانات ناقصة
            // =========================================

            if (
                !task.date ||
                !task.time
            ) {

                continue;
            }


            // =========================================
            // تم إرسالها من قبل
            // =========================================

            if (
                task.notificationSent === true
            ) {

                console.log(
                    "⏭️ تم إرسال الإشعار من قبل:",
                    task.name
                );

                continue;
            }


            // =========================================
            // حساب الفرق
            // =========================================

            const result =
                getTaskTimeInMinutes(task);

            if (!result) {

                console.log(
                    "⚠️ وقت المهمة غير صحيح:",
                    task.name
                );

                continue;
            }

            const difference =
                result.difference;


            console.log(
                "⏱️ الفرق:",
                difference.toFixed(2),
                "دقيقة"
            );


            // =========================================
            // المهمة في المستقبل
            // =========================================

            if (difference < 0) {

                continue;
            }


            // =========================================
            // المهمة أقدم من 5 دقائق
            // =========================================

            if (difference > 5) {

                continue;
            }


            // =========================================
            // حان وقت المهمة
            // =========================================

            console.log(
                "🚨 حان وقت المهمة:",
                task.name
            );


            // =========================================
            // إرسال الإشعار
            // =========================================

            const sent =
                await sendNotification(
                    tokens,
                    task
                );


            // =========================================
            // تسجيل نجاح الإرسال
            // =========================================

            if (sent) {

                await doc.ref.update({

                    notificationSent:
                        true,

                    notificationSentAt:
                        admin.firestore
                            .FieldValue
                            .serverTimestamp()

                });

                console.log(
                    "✅ تم تسجيل المهمة كمُرسلة:",
                    task.name
                );

            }

        }


        console.log(
            "✅ انتهى فحص المهام"
        );

    }
    catch (error) {

        console.error(
            "❌ خطأ:",
            error
        );

        process.exit(1);
    }
}


// =====================================================
// تشغيل
// =====================================================

checkTasks();

