// ================================
// قاعدة البيانات
// ================================

const DB_NAME = "TasksDB";
const DB_VERSION = 1;
const STORE_NAME = "tasks";

// فتح قاعدة البيانات
function openDB() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                DB_NAME,
                DB_VERSION
            );

        request.onupgradeneeded =
            function (event) {

                const db =
                    event.target.result;

                if (
                    !db.objectStoreNames.contains(
                        STORE_NAME
                    )
                ) {

                    db.createObjectStore(
                        STORE_NAME,
                        {
                            keyPath: "id"
                        }
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

    });

}

// ================================
// حفظ مهمة
// ================================

async function saveTask(task) {

    const db =
        await openDB();

    const transaction =
        db.transaction(
            STORE_NAME,
            "readwrite"
        );

    const store =
        transaction.objectStore(
            STORE_NAME
        );

    store.put(task);

}

// ================================
// قراءة كل المهام
// ================================

async function getAllTasks() {

    return new Promise(
        async (
            resolve,
            reject
        ) => {

            const db =
                await openDB();

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

// ================================
// حذف مهمة
// ================================

async function deleteTaskDB(id) {

    const db =
        await openDB();

    const transaction =
        db.transaction(
            STORE_NAME,
            "readwrite"
        );

    const store =
        transaction.objectStore(
            STORE_NAME
        );

    store.delete(id);

}

// ================================
// تحديث مهمة
// ================================

async function updateTask(task) {

    const db =
        await openDB();

    const transaction =
        db.transaction(
            STORE_NAME,
            "readwrite"
        );

    const store =
        transaction.objectStore(
            STORE_NAME
        );

    store.put(task);

}

async function deleteTaskDB(id) {

    const db =
        await openDB();

    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );

            tx.objectStore(
                STORE_NAME
            ).delete(id);

            tx.oncomplete =
                () => resolve();

            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}