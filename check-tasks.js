const admin = require("firebase-admin");

const serviceAccount =
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function sendNotification(tokens, task) {

    if (tokens.length === 0) {
        console.log("❌ لا توجد أجهزة مسجلة");
        return;
    }

    const message = {
        tokens: tokens,

        data: {
            title: "🔔 حان وقت المهمة",
            body: task.name || "لديك مهمة الآن",
            taskId: String(task.id || "")
        }
    };

    const response =
        await admin.messaging().sendEachForMulticast(message);

    console.log(
        `📨 تم إرسال ${response.successCount} إشعار`
    );

    console.log(
        `❌ فشل إرسال ${response.failureCount} إشعار`
    );
}

async function checkTasks() {

    try {

        // ================================
        // الوقت الحالي بتوقيت مصر
        // ================================

        const now = new Date();

        const egyptTime =
            new Intl.DateTimeFormat("en-CA", {
                timeZone: "Africa/Cairo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }).formatToParts(now);

        const getPart = (type) =>
            egyptTime.find(
                part => part.type === type
            ).value;

        const currentDate =
            `${getPart("year")}-${getPart("month")}-${getPart("day")}`;

        const currentHour =
            getPart("hour");

        const currentMinute =
            getPart("minute");

        const currentTime =
            `${currentHour}:${currentMinute}`;

        console.log(
            `🕐 الوقت الحالي في مصر: ${currentDate} ${currentTime}`
        );

        // ================================
        // قراءة المهام
        // ================================

        const snapshot =
            await db
                .collection("tasks")
                .get();

        console.log(
            `📋 عدد المهام: ${snapshot.size}`
        );

        // ================================
        // قراءة Tokens
        // ================================

        const tokenSnapshot =
            await db
                .collection("notificationTokens")
                .get();

        const tokens = [];

        tokenSnapshot.forEach((doc) => {

            const data = doc.data();

            if (data.token) {
                tokens.push(data.token);
            }

        });

        console.log(
            `📱 عدد الأجهزة: ${tokens.length}`
        );

        // ================================
        // فحص المهام
        // ================================

        for (const doc of snapshot.docs) {

            const task = doc.data();

            console.log(
                "🔔 مهمة:",
                task.name,
                "|",
                task.date,
                "|",
                task.time
            );

            if (task.completed) {
                continue;
            }

            if (!task.date || !task.time) {
                continue;
            }

            // هل موعد المهمة الآن؟
            if (
                task.date === currentDate &&
                task.time === currentTime
            ) {

                // منع إرسال نفس الإشعار أكثر من مرة
                if (task.notificationSent === true) {
                    console.log(
                        "⏭️ الإشعار تم إرساله من قبل:",
                        task.name
                    );

                    continue;
                }

                console.log(
                    "🚨 حان وقت المهمة:",
                    task.name
                );

                await sendNotification(
                    tokens,
                    task
                );

                await doc.ref.update({
                    notificationSent: true,
                    notificationSentAt:
                        admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(
                    "✅ تم تسجيل المهمة كمُرسلة"
                );
            }
        }

    } catch (error) {

        console.error(
            "❌ Firestore:",
            error
        );

        process.exit(1);
    }
}

checkTasks();