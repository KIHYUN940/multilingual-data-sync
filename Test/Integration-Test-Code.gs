/**
 * 헬퍼: 스크립트 속성에서 테스트 시트 ID 가져오기
 */
function getTestSheetId() {
  const id = PropertiesService.getScriptProperties().getProperty("TEST_SHEET_ID");
  if (!id) throw new Error("TEST_SHEET_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

/**
 * 통합 테스트: TestSheet → Firestore test 컬렉션 → 업로드/삭제 검증
 * 시트에 없는 문서는 Firestore에서 삭제됨
 */
function runFullIntegrationTest() {
  const TEST_SHEET_ID = getTestSheetId();
  const testCollection = PropertiesService.getScriptProperties().getProperty("COLLECTION_TEST");
  Logger.log("TEST_COLLECTION: " + testCollection);

  // ====== 1. TestSheet 로드 ======
  const ss = SpreadsheetApp.openById(TEST_SHEET_ID);
  const sheet = ss.getSheets()[0]; // 첫 번째 시트 사용
  Logger.log("TestSheet 로드 완료: " + sheet.getName());

  // ====== 2. Firestore 동기화 (테스트 컬렉션, 삭제 포함) ======
  syncAllSheetsToFirestoreTest(ss, testCollection, false);
  Logger.log("Firestore 테스트 컬렉션 동기화 완료");

  // ====== 3. Firestore 업로드 결과 확인 ======
  const token = getOAuthToken_();
  const projectId = getConfig("FIRESTORE_PROJECT");
  const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${testCollection}`;
  const res = UrlFetchApp.fetch(listUrl, { headers: { Authorization: "Bearer " + token } });
  const docs = JSON.parse(res.getContentText()).documents || [];
  const keys = docs.map(d => d.name.split("/").pop());
  Logger.log("Firestore 최종 문서: " + JSON.stringify(keys));

  // 검증: 시트에 있는 모든 키가 Firestore에 있어야 함
  const sheetData = sheet.getDataRange().getValues();
  const expectedKeys = sheetData.slice(1).map(row => row[0]); // 헤더 제외
  const missingKeys = expectedKeys.filter(k => !keys.includes(k));
  if (missingKeys.length > 0) {
    throw new Error("통합 테스트 실패: 누락된 키 - " + missingKeys.join(", "));
  }
  Logger.log("업로드 검증 통과!");
  Logger.log("통합 테스트 완료. 시트에 없는 문서는 Firestore에서 삭제되었습니다.");
}

/**
 * syncAllSheetsToFirestoreTest
 * collectionName: 테스트 컬렉션
 * skipDelete: false이면 시트에 없는 문서 삭제
 */
function syncAllSheetsToFirestoreTest(ss, collectionName, skipDelete) {
  const sheets = ss.getSheets();
  const sheetKeys = new Set();
  const token = getOAuthToken_();
  const FIRESTORE_PROJECT = getConfig("FIRESTORE_PROJECT");
  const COLLECTION = collectionName || getConfig("COLLECTION");

  sheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (!data || data.length === 0) return;

    // 키 컬럼 탐색
    let keyCol = -1, headerRow = -1;
    outerLoop:
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        if ((data[r][c] || "").toString().trim().toLowerCase() === "key") {
          keyCol = c;
          headerRow = r;
          break outerLoop;
        }
      }
    }
    if (keyCol === -1) return;

    const header = data[headerRow];
    const koCol = header.findIndex(h => (h || "").toString().trim().toLowerCase() === "value_ko");
    const enCol = header.findIndex(h => (h || "").toString().trim().toLowerCase() === "value_en");
    const mnCol = header.findIndex(h => (h || "").toString().trim().toLowerCase() === "value_mn");

    // Firestore 업로드
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      const key = sanitizeFirestoreKey(row[keyCol]);
      if (!key) continue;
      sheetKeys.add(key);

      const docData = {
        fields: {
          ko: { stringValue: koCol >= 0 ? row[koCol] || "" : "" },
          en: { stringValue: enCol >= 0 ? row[enCol] || "" : "" },
          mn: { stringValue: mnCol >= 0 ? row[mnCol] || "" : "" }
        }
      };

      const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${key}`;
      try {
        const response = UrlFetchApp.fetch(url, {
          method: "PATCH",
          contentType: "application/json",
          payload: JSON.stringify(docData),
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true
        });
        if (response.getResponseCode() === 404) {
          const createUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}?documentId=${key}`;
          UrlFetchApp.fetch(createUrl, {
            method: "POST",
            contentType: "application/json",
            payload: JSON.stringify(docData),
            headers: { Authorization: `Bearer ${token}` },
            muteHttpExceptions: true
          });
        }
        Logger.log(`PATCH ${key}: ${response.getResponseCode()}`);
      } catch (err) {
        Logger.log(`Error uploading ${key}: ${err}`);
      }
    }
  });

  // Firestore 삭제 처리: skipDelete가 false이면 시트에 없는 문서 삭제
  if (!skipDelete) {
    const listUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}`;
    const response = UrlFetchApp.fetch(listUrl, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    const json = JSON.parse(response.getContentText());
    if (json.documents) {
      json.documents.forEach(doc => {
        const docId = doc.name.split("/").pop();
        if (!sheetKeys.has(docId)) {
          const delUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}`;
          UrlFetchApp.fetch(delUrl, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, muteHttpExceptions: true });
          Logger.log("삭제 " + docId + ": 완료");
        }
      });
    }
  }

  Logger.log("syncAllSheetsToFirestoreTest 실행 완료, 컬렉션: " + COLLECTION + (!skipDelete ? " (시트 없는 문서 삭제 포함)" : ""));
}
