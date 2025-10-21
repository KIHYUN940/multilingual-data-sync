/**
 * Firestore와 Google Sheets 부분 동기화 + 전체 동기화 + 삭제
 * 변경 감지 + 웹앱 + 소유자 권한
 * 공유 계정도 버튼을 눌러 동기화 가능
 * 민감 정보는 Script Properties 환경변수에서 가져와 안전하게 처리
 */

// ====== 환경 변수 ======
// Script Properties에 아래 키/값을 등록
// FIRESTORE_PROJECT = your-project-id
// COLLECTION = your-collection-name
// SERVICE_ACCOUNT_JSON = your-service-account-json (전체 문자열)
// WEBAPP_URL = your-webapp-url

function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);
  if (!value) throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
  return value;
}

// ====== 시트 메뉴 ======
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Firestore Sync")
    .addItem("Sync Changed Rows", "triggerChangedSync")
    .addItem("Full Sync", "triggerFullSync")
    .addItem("Delete Missing Data", "triggerDelete")
    .addToUi();
}

// ====== 웹앱 호출 공통 함수 ======
function callWebApp(action) {
  const WEBAPP_URL = getConfig("WEBAPP_URL");
  const response = UrlFetchApp.fetch(WEBAPP_URL, {
    method: "post",
    payload: { action },
    muteHttpExceptions: true
  });
  return JSON.parse(response.getContentText());
}

// ====== 메뉴 클릭 시 변경된 행만 동기화 ======
function triggerChangedSync() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "Firestore 부분 동기화",
    "변경된 행만 Firestore에 동기화하시겠습니까?",
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    const result = callWebApp("syncChangedRows");

    if (result.failedDocs && result.failedDocs.length > 0) {
      const messages = result.failedDocs.map(f => `- ${f.key}: ${f.error}`).join("\n");
      ui.alert("동기화 완료!\n하지만 일부 문서가 실패했습니다:\n" + messages);
    } else {
      ui.alert("변경 감지 동기화 완료! 모든 문서가 성공했습니다.");
    }
  } catch (err) {
    ui.alert("동기화 실패: " + err.message);
  }
}

// ====== 전체 동기화 메뉴 클릭 시 ======
function triggerFullSync() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "전체 동기화",
    "시트 전체를 Firestore에 다시 동기화하시겠습니까?",
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // 모든 sheet_cache_* 삭제 → 캐시 초기화
    ss.getSheets().forEach(sheet => {
      const cacheKey = `sheet_cache_${sheet.getName()}`;
      PropertiesService.getScriptProperties().deleteProperty(cacheKey);
    });

    // 기존 syncChangedRows() 재사용
    const result = syncChangedRows(ss);
    if (result.failedDocs && result.failedDocs.length > 0) {
      const messages = result.failedDocs.map(f => `- ${f.key}: ${f.error}`).join("\n");
      ui.alert("전체 동기화 완료!\n하지만 일부 문서가 실패했습니다:\n" + messages);
    } else {
      ui.alert("전체 동기화 완료! 모든 문서가 성공했습니다.");
    }
  } catch (err) {
    ui.alert("전체 동기화 실패: " + err.message);
  }
}

// ====== 메뉴 클릭 시 삭제 ======
function triggerDelete() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "Firestore 삭제",
    "시트에 없는 Firestore 데이터를 삭제하시겠습니까?",
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    callWebApp("deleteMissing");
    ui.alert("삭제 완료!");
  } catch (err) {
    ui.alert("삭제 실패: " + err.message);
  }
}

// ====== 웹앱 엔드포인트 ======
function doPost(e) {
  const action = e.parameter.action;

  if (action === "syncChangedRows") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = syncChangedRows(ss);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "deleteMissing") {
    deleteMissingFromFirestore();
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ error: "Unknown action" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ====== Firestore 키 안전 처리 ======
function sanitizeFirestoreKey(key) {
  if (!key) return "_";
  return key.toString().trim()
    .replace(/[\/#\[\]\s]/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
}

// ====== OAuth2 토큰 생성 (환경변수 기반 서비스 계정 JSON) ======
function getOAuthToken_() {
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty('FIRESTORE_OAUTH');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.expireAt && parsed.expireAt > Date.now()) return parsed.token;
    } catch(e) {}
  }

  // ===== 환경변수에서 JSON 바로 가져오기 =====
  const serviceAccountStr = getConfig("SERVICE_ACCOUNT_JSON");
  const serviceAccount = JSON.parse(serviceAccountStr);

  const privateKey = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signatureBytes = Utilities.computeRsaSha256Signature(signingInput, privateKey);
  const encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes);
  const signedJwt = `${signingInput}.${encodedSignature}`;

  const body = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer'
    + '&assertion=' + encodeURIComponent(signedJwt);

  const options = { method: 'post', contentType: 'application/x-www-form-urlencoded', payload: body, muteHttpExceptions: true };
  const tokenResponse = UrlFetchApp.fetch(serviceAccount.token_uri, options);
  if (tokenResponse.getResponseCode() !== 200) {
    throw new Error(`Token request failed: ${tokenResponse.getResponseCode()} - ${tokenResponse.getContentText()}`);
  }

  const data = JSON.parse(tokenResponse.getContentText());
  const token = data.access_token;
  const expiresIn = data.expires_in || 3600;

  PropertiesService.getScriptProperties().setProperty('FIRESTORE_OAUTH', JSON.stringify({
    token: token,
    expireAt: Date.now() + (expiresIn - 60) * 1000
  }));

  return token;
}

// ====== 변경 감지 후 Firestore 업데이트 ======
function syncChangedRows(ss) {
  const sheets = ss.getSheets();
  const token = getOAuthToken_();
  const FIRESTORE_PROJECT = getConfig("FIRESTORE_PROJECT");
  const COLLECTION = getConfig("COLLECTION");

  const processedSheetNames = [];
  const failedDocs = [];

  sheets.forEach(sheet => {
    processedSheetNames.push(sheet.getName());
    const data = sheet.getDataRange().getValues();
    if (!data || data.length === 0) return;

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
    const cacheKey = `sheet_cache_${sheet.getName()}`;
    const cachedStr = PropertiesService.getScriptProperties().getProperty(cacheKey) || "{}";
    let cachedData = {};
    try { cachedData = JSON.parse(cachedStr); } catch (e) { cachedData = {}; }

    const writes = [];
    const keyList = [];
    const finalCache = {};

    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      const rawKey = row[keyCol];
      const key = sanitizeFirestoreKey(rawKey);
      if (!key) continue;

      const fields = {};
      for (let c = 0; c < header.length; c++) {
        if (c === keyCol) continue;
        const fieldName = (header[c] || "").toString().trim();
        if (!fieldName) continue;
        fields[fieldName] = { stringValue: (row[c] || "").toString() };
      }

      const currentHash = JSON.stringify(fields);
      // 캐시 없거나 다르면 Firestore에 쓰기
      if (!cachedData[key] || cachedData[key] !== currentHash) {
        const docPath = `projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${key}`;
        writes.push({ update: { name: docPath, fields } });
        keyList.push(key);
      }
      finalCache[key] = currentHash;
    }

    if (writes.length > 0) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:commit`;
        const response = UrlFetchApp.fetch(url, {
          method: "POST",
          contentType: "application/json",
          payload: JSON.stringify({ writes }),
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true
        });
        const result = JSON.parse(response.getContentText());
        if (result.writeResults && result.writeResults.length === keyList.length) {
          result.writeResults.forEach((res, idx) => {
            if (res.status && res.status.code !== 0) {
              failedDocs.push({ key: keyList[idx], error: res.status.message || "unknown error" });
            }
          });
        }
      } catch (err) {
        Logger.log(`Error committing writes for sheet "${sheet.getName()}": ${err}`);
      }
    }

    try { PropertiesService.getScriptProperties().setProperty(cacheKey, JSON.stringify(finalCache)); }
    catch (e) { Logger.log(`Failed to set cache for ${cacheKey}: ${e}`); }
  });

  try { cleanUpSheetCaches(processedSheetNames); } catch (e) { Logger.log(`cleanUpSheetCaches error: ${e}`); }

  return { failedDocs };
}

// ====== 존재하지 않는 sheet_cache_* 정리 ======
function cleanUpSheetCaches(existingSheetNames) {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  for (const k in allProps) {
    if (!k || !k.startsWith("sheet_cache_")) continue;
    const sheetName = k.substring("sheet_cache_".length);
    if (existingSheetNames.indexOf(sheetName) === -1) {
      try { props.deleteProperty(k); Logger.log(`Deleted stale cache property: ${k}`); }
      catch (e) { Logger.log(`Failed to delete cache property ${k}: ${e}`); }
    }
  }
}

// ====== Firestore 삭제 (배치 + 페이지네이션 + 재시도 + 로그) ======
function deleteMissingFromFirestore() {
  const token = getOAuthToken_();
  const FIRESTORE_PROJECT = getConfig("FIRESTORE_PROJECT");
  const COLLECTION = getConfig("COLLECTION");
  const batchSize = 250;
  const waitMs = 500;
  const maxRetries = 3;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetKeys = new Set();
  const sheetCacheMap = {};

  ss.getSheets().forEach(sheet => {
    const sheetName = sheet.getName();
    const data = sheet.getDataRange().getValues();
    if (!data || data.length === 0) return;

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

    const cacheKey = `sheet_cache_${sheetName}`;
    const cachedStr = PropertiesService.getScriptProperties().getProperty(cacheKey) || "{}";
    let cachedData = {};
    try { cachedData = JSON.parse(cachedStr); } catch (e) { cachedData = {}; }
    sheetCacheMap[sheetName] = cachedData;

    for (let i = headerRow + 1; i < data.length; i++) {
      const key = sanitizeFirestoreKey(data[i][keyCol]);
      if (key) sheetKeys.add(key);
    }
  });

  let nextPageToken = null;
  let totalDeleted = 0;
  let batchNumber = 0;

  do {
    let listUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}?pageSize=${batchSize}`;
    if (nextPageToken) listUrl += `&pageToken=${nextPageToken}`;

    const response = UrlFetchApp.fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });

    const json = JSON.parse(response.getContentText());
    if (!json.documents || json.documents.length === 0) break;

    const docsToDelete = json.documents.filter(doc => {
      const docId = doc.name.split("/").pop();
      return !sheetKeys.has(docId);
    });

    if (docsToDelete.length === 0) {
      nextPageToken = json.nextPageToken || null;
      continue;
    }

    batchNumber++;
    Logger.log(`Starting Batch ${batchNumber}: ${docsToDelete.length} docs to delete`);

    const failedDocs = [];

    for (let i = 0; i < docsToDelete.length; i++) {
      const doc = docsToDelete[i];
      const docId = doc.name.split("/").pop();
      let deleted = false;
      let attempts = 0;

      while (!deleted && attempts < maxRetries) {
        try {
          const delUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}`;
          UrlFetchApp.fetch(delUrl, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            muteHttpExceptions: true
          });
          deleted = true;

          // 캐시에서도 삭제
          for (const sheetName in sheetCacheMap) {
            if (sheetCacheMap[sheetName][docId]) {
              delete sheetCacheMap[sheetName][docId];
              PropertiesService.getScriptProperties().setProperty(`sheet_cache_${sheetName}`, JSON.stringify(sheetCacheMap[sheetName]));
            }
          }
        } catch (e) {
          attempts++;
          Logger.log(`Failed to delete Firestore doc ${docId} (attempt ${attempts}): ${e}`);
          Utilities.sleep(1000);
        }
      }

      if (!deleted) failedDocs.push(docId);
    }

    totalDeleted += (docsToDelete.length - failedDocs.length);
    Logger.log(`Batch ${batchNumber} deleted: ${docsToDelete.length - failedDocs.length} docs, failed: ${failedDocs.length}`);

    Utilities.sleep(waitMs);
    nextPageToken = json.nextPageToken || null;
  } while (nextPageToken);

  Logger.log(`Firestore 삭제 완료. 총 삭제 문서 수: ${totalDeleted}`);
}

// ====== 테스트용 시트 생성 (1500행) ======
function createTestDataSheet1500() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("TestData");
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet("TestData");

  sheet.appendRow(["key", "value"]);

  const rows = [];
  for (let i = 1; i <= 1500; i++) {
    rows.push([`TestKey${i}`, `Value${i}`]);
  }

  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  Logger.log("테스트 시트(TestData) 1500행 생성 완료");
}
