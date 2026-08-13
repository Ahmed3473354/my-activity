const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
});

exports.checkTasks = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: "Africa/Cairo",
  },
  async () => {
    console.log("🔔 فحص المهام...");

    // سنضيف هنا قراءة المهام وإرسال FCM
    console.log("✅ انتهى الفحص");
  }
);