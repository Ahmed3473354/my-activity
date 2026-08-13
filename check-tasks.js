const admin = require("firebase-admin");

const serviceAccount =
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential:
        admin.credential.cert(serviceAccount)
});

const db =
    admin.firestore();

async function checkTasks() {

    try {

        const snapshot =
            await db
                .collection("tasks")
                .get();

        console.log(
            `📋 عدد المهام: ${snapshot.size}`
        );

        snapshot.forEach((doc) => {

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

        });

    } catch (error) {

        console.error(
            "❌ Firestore:",
            error
        );

        process.exit(1);
    }
}

checkTasks();