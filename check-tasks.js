const { initializeApp, cert } =
    require("firebase-admin/app");

const {
    getFirestore,
    FieldValue
} = require("firebase-admin/firestore");

const {
    getMessaging
} = require("firebase-admin/messaging");

// =====================================================
// قراءة Firebase Service Account
// =====================================================

const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {

    console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT غير موجود"
    );

    process.exit(1);
}

let serviceAccount;

try {

    serviceAccount =
        JSON.parse(
            serviceAccountRaw
        );

} catch (error) {

    console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT ليس JSON صحيح"
    );

    process.exit(1);
}

// =====================================================
// تشغيل Firebase Admin
// =====================================================

try {

    initializeApp({

        credential:
            cert(serviceAccount)

    });

} catch (error) {

    console.error(
        "❌ فشل تشغيل Firebase Admin"
    );

    console.error(error);

    process.exit(1);
}

const db =
    getFirestore();

const messaging =
    getMessaging();

// =====================================================
// إرسال الإشعار
// =====================================================

async function sendNotification(
    tokens,
    task
) {

    if (
        !tokens ||
        tokens.length === 0
    ) {

        console.log(
            "⚠️ لا توجد أجهزة مسجلة"
        );

        return false;
    }

    const message = {

        tokens: tokens,

        data: {

            title:
                "🔔 حان وقت المهمة",

            body:
                String(
                    task.name ||
                    "لديك مهمة الآن"
                ),

            taskId:
                String(
                    task.id ||
                    task.firestoreId ||
                    ""
                )

        }

    };

    try {

        const response =
            await messaging
                .sendEachForMulticast(
                    message
                );

        console.log(
            `📨 نجح إرسال ${response.successCount} إشعار`
        );

        console.log(
            `❌ فشل إرسال ${response.failureCount} إشعار`
        );

        // =============================================
        // تنظيف Tokens غير الصالحة
        // =============================================

        if (
            response.failureCount > 0
        ) {

            const tokenSnapshot =
                await db
                    .collection(
                        "notificationTokens"
                    )
                    .get();

            const deletePromises = [];

            response.responses.forEach(
                function (
                    result,
                    index
                ) {

                    if (
                        result.success
                    ) {

                        return;
                    }

                    const errorCode =
                        result.error?.code ||
                        "";

                    console.log(
                        "⚠️ Token فشل:",
                        errorCode
                    );

                    if (
                        errorCode.includes(
                            "registration-token-not-registered"
                        ) ||
                        errorCode.includes(
                            "invalid-registration-token"
                        )
                    ) {

                        const badToken =
                            tokens[index];

                        tokenSnapshot.forEach(
                            function (
                                tokenDoc
                            ) {

                                const data =
                                    tokenDoc.data();

                                if (
                                    data.token ===
                                    badToken
                                ) {

                                    deletePromises.push(
                                        tokenDoc.ref.delete()
                                    );

                                }

                            }
                        );

                    }

                }
            );

            await Promise.all(
                deletePromises
            );

            console.log(
                `🧹 تم تنظيف ${deletePromises.length} Token غير صالح`
            );

        }

        return (
            response.successCount > 0
        );

    }
    catch (error) {

        console.error(
            "❌ خطأ أثناء إرسال الإشعار:"
        );

        console.error(error);

        return false;
    }

}

// =====================================================
// الحصول على الوقت في مصر
// =====================================================

function getEgyptTime() {

    const now =
        new Date();

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {

                timeZone:
                    "Africa/Cairo",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false

            }
        ).formatToParts(
            now
        );

    function getPart(
        type
    ) {

        const part =
            parts.find(
                function (
                    item
                ) {

                    return (
                        item.type ===
                        type
                    );

                }
            );

        return part
            ? part.value
            : "";

    }

    return {

        date:
            `${getPart("year")}-${getPart("month")}-${getPart("day")}`,

        time:
            `${getPart("hour")}:${getPart("minute")}`

    };

}

// =====================================================
// تحويل موعد المهمة إلى UTC
// =====================================================

function taskToDate(
    task
) {

    if (
        !task.date ||
        !task.time
    ) {

        return null;
    }

    const dateParts =
        String(
            task.date
        ).split("-");

    const timeParts =
        String(
            task.time
        ).split(":");

    if (
        dateParts.length !== 3 ||
        timeParts.length !== 2
    ) {

        return null;
    }

    const year =
        Number(
            dateParts[0]
        );

    const month =
        Number(
            dateParts[1]
        );

    const day =
        Number(
            dateParts[2]
        );

    const hour =
        Number(
            timeParts[0]
        );

    const minute =
        Number(
            timeParts[1]
        );

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        !Number.isInteger(hour) ||
        !Number.isInteger(minute)
    ) {

        return null;
    }

    /*
     * وقت مصر في الفترة الحالية UTC+3.
     *
     * مثال:
     *
     * 22:00 مصر
     *
     * تصبح:
     *
     * 19:00 UTC
     */

    return new Date(
        Date.UTC(
            year,
            month - 1,
            day,
            hour - 3,
            minute
        )
    );

}

// =====================================================
// قراءة Tokens
// =====================================================

async function getTokens() {

    const snapshot =
        await db
            .collection(
                "notificationTokens"
            )
            .get();

    const tokens = [];

    snapshot.forEach(
        function (
            tokenDoc
        ) {

            const data =
                tokenDoc.data();

            if (
                data &&
                typeof data.token ===
                    "string" &&
                data.token.length > 0
            ) {

                tokens.push(
                    data.token
                );

            }

        }
    );

    return [
        ...new Set(tokens)
    ];

}

// =====================================================
// فحص المهام
// =====================================================

async function checkTasks() {

    try {

        console.log(
            "======================================"
        );

        console.log(
            "🚀 بدء فحص المهام"
        );

        console.log(
            "======================================"
        );

        // =============================================
        // الوقت في مصر
        // =============================================

        const egyptTime =
            getEgyptTime();

        console.log(
            `🕐 الوقت في مصر: ${egyptTime.date} ${egyptTime.time}`
        );

        // =============================================
        // الوقت الحالي UTC
        // =============================================

        const now =
            new Date();

        // =============================================
        // قراءة المهام
        // =============================================

        const snapshot =
            await db
                .collection(
                    "tasks"
                )
                .get();

        console.log(
            `📋 عدد المهام: ${snapshot.size}`
        );

        // =============================================
        // قراءة الأجهزة
        // =============================================

        const tokens =
            await getTokens();

        console.log(
            `📱 عدد الأجهزة: ${tokens.length}`
        );

        // =============================================
        // فحص المهام
        // =============================================

        for (
            const taskDoc
            of snapshot.docs
        ) {

            const task =
                taskDoc.data();

            console.log(
                `🔔 مهمة: ${task.name || "بدون اسم"} | ${task.date || "-"} | ${task.time || "-"}`
            );

            // =========================================
            // المهمة مكتملة
            // =========================================

            if (
                task.completed === true
            ) {

                console.log(
                    "✅ المهمة مكتملة"
                );

                continue;
            }

            // =========================================
            // التأكد من التاريخ والوقت
            // =========================================

            if (
                !task.date ||
                !task.time
            ) {

                console.log(
                    "⚠️ المهمة بدون تاريخ أو وقت"
                );

                continue;
            }

            // =========================================
            // منع إرسال نفس المهمة مرة أخرى
            // =========================================

            if (
                task.notificationSent === true
            ) {

                console.log(
                    "⏭️ الإشعار أُرسل سابقًا"
                );

                continue;
            }

            // =========================================
            // تحويل موعد المهمة
            // =========================================

            const taskDate =
                taskToDate(
                    task
                );

            if (!taskDate) {

                console.log(
                    "❌ تاريخ المهمة غير صحيح"
                );

                continue;
            }

            // =========================================
            // حساب الفرق
            // =========================================

            const difference =
                now.getTime() -
                taskDate.getTime();

            const minutes =
                difference /
                60000;

            console.log(
                `⏱️ الفرق: ${minutes.toFixed(2)} دقيقة`
            );

            // =========================================
            // المهمة مستقبلية
            // =========================================

            if (
                difference < 0
            ) {

                console.log(
                    "⏳ لم يحن موعد المهمة"
                );

                continue;
            }

            // =========================================
            // فات أكثر من 5 دقائق
            // =========================================

            if (
                difference >
                5 * 60 * 1000
            ) {

                console.log(
                    "⌛ فات موعد المهمة بأكثر من 5 دقائق"
                );

                continue;
            }

            // =========================================
            // حان وقت المهمة
            // =========================================

            console.log(
                "🚨 حان وقت المهمة!"
            );

            console.log(
                `📌 ${task.name}`
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
            // تسجيل الإرسال
            // =========================================

            if (sent) {

                await taskDoc.ref.update({

                    notificationSent:
                        true,

                    notificationSentAt:
                        FieldValue.serverTimestamp()

                });

                console.log(
                    "✅ تم تسجيل الإشعار:"
                );

                console.log(
                    `📌 ${task.name}`
                );

            }
            else {

                console.log(
                    "⚠️ لم يتم تسجيل المهمة كمُرسلة لأن الإرسال فشل"
                );

            }

        }

        console.log(
            "======================================"
        );

        console.log(
            "✅ انتهى فحص المهام"
        );

        console.log(
            "======================================"
        );

    }
    catch (error) {

        console.error(
            "❌ خطأ أثناء فحص المهام:"
        );

        console.error(
            error
        );

        process.exit(1);
    }

}

// =====================================================
// تشغيل
// =====================================================

checkTasks();
