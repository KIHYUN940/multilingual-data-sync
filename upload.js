const xlsx = require("xlsx");
const admin = require("firebase-admin");
const serviceAccount = require("./keys/serviceAccountKey.json");

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 엑셀 파일 읽기
const workbook = xlsx.readFile("./data/multilingual.xlsx");

// 키 중복 제거용 Set
const uniqueKeys = new Set();

async function uploadData() {
  console.log("Sheets in workbook:", workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // 3행부터 데이터 읽기 (range: 2)
    const rows = xlsx.utils.sheet_to_json(sheet, { range: 2 });

    console.log(`\n=== Uploading Sheet: ${sheetName} (Rows: ${rows.length}) ===`);
    if (rows.length > 0) {
      console.log("First row sample:", rows[0]);
    }

    for (const row of rows) {
      const key = row.Key;
      if (!key) continue; // Key 없으면 스킵

      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);

        const data = {
          ko: row.Value_KO || "",
          en: row.Value_EN || "",
          mn: row.Value_MN || ""
        };

        // 컬렉션 "translations"에 key 문서로 저장
        await db.collection("translations").doc(key).set(data);
        console.log(`Uploaded: ${key}`);
      } else {
        console.log(`Skipped duplicate key: ${key}`);
      }
    }
  }
}

uploadData()
  .then(() => console.log("\nAll data uploaded!"))
  .catch((err) => console.error("Error uploading data:", err));
