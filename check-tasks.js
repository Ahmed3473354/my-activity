
const admin = require("firebase-admin");

// =====================================================
// قراءة Firebase Service Account
// =====================================================

const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
    console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT غير موجود في GitHub Secrets"
    );

    process.exit(1);
}

let serviceAccount;

try {
    serviceAccount = JSON.parse(
        serviceAccountRaw
    );
} catch (error) {
    console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT ليس JSON صحيح"
    );

    console.error(error.message);

    process.exit(1);
}

// =====================================================
// تشغيل Firebase Admin
// =====================================================

try {

    admin.initializeApp({
        credential:
            admin.credential.cert(
                serviceAccount
            )
    });

} catch (error) {

    console.error(
        "❌ فشل تشغيل Firebase Admin"
    );

    console.error(error);

    process.exit(1);
}

// =====================================================
// Firestore
// =====================================================

const db =
    admin.firestore();

const messaging =
    admin.messaging();

// =====================================================
// إرسال الإشعار
// =====================================================

async function sendNotification(
    tokens,
    task
) {

    if (!tokens.length) {

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
        // حذف Tokens غير الصالحة
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
                        !result.success
                    ) {

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
            "❌ خطأ أثناء إرسال الإشعار:",
            error
        );

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
// تحويل موعد المهمة
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

    const value =
        `${task.date}T${task.time}:00`;

    /*
     * لا نضع +03:00 يدويًا.
     * GitHub Actions يعمل بتوقيت UTC.
     *
     * لذلك نقارن باستخدام الوقت المصري
     * بدل الاعتماد على Timezone الجهاز.
     */

    const parts =
        String(
            task.date
        ).split("-");

    const timeParts =
        String(
            task.time
        ).split(":");

    if (
        parts.length !== 3 ||
        timeParts.length !== 2
    ) {

        return null;
    }

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);

    const hour =
        Number(timeParts[0]);

    const minute =
        Number(timeParts[1]);

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute)
    ) {

        return null;
    }

    /*
     * نحول وقت مصر إلى UTC.
     *
     * مصر في التوقيت الحالي UTC+3.
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
                data.token &&
                typeof data.token ===
                    "string"
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
        // الوقت المصري
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
        // المهام
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
        // الأجهزة
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
            // التاريخ والوقت
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
            // منع إرسال الإشعار مرة ثانية
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
            // الفرق
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
            // المهمة في المستقبل
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
            // لو فات أكثر من 5 دقائق
            // =========================================

            if (
                difference >
                5 * 60 * 1000
            ) {

                console.log(
                    "⌛ فات الموعد بأكثر من 5 دقائق"
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

            if (
                sent
            ) {

                await taskDoc.ref.update({

                    notificationSent:
                        true,

                    notificationSentAt:
                        admin
                            .firestore
                            .FieldValue
                            .serverTimestamp()

                });

                console.log(
                    "✅ تم تسجيل الإشعار"
                );

            }
            else {

                console.log(
                    "⚠️ لم يتم تسجيل المهمة كمُرسلة"
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

