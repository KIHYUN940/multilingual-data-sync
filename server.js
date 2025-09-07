const express = require("express");
const xlsx = require("xlsx");
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require("./keys/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = 3000;

// 정적 파일 제공 (index.html)
app.use(express.static(path.join(__dirname, "public")));

// 엑셀 업로드 함수
async function uploadData() {
  const workbook = xlsx.readFile("./data/multilingual.xlsx");

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // 헤더 포함

    // 첫 행은 키/언어 컬럼 이름이므로 제외
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const key = row[0]; // 첫 열이 Key
      if (!key) continue;

      const data = {
        ko: row[1] || "",
        en: row[2] || "",
        mn: row[3] || "",
      };

      await db.collection("translations").doc(key).set(data);
      console.log(`Uploaded: ${key}`);
    }
  }
}

// 업로드 API
app.post("/upload", async (req, res) => {
  try {
    await uploadData();
    res.json({ message: "All data uploaded!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error uploading data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
