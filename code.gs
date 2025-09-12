/**
 * Firestore와 Google Sheets 부분 동기화 (변경 감지 + 웹앱 + 소유자 권한)
 * 공유 계정도 버튼을 눌러 동기화 가능
 * 민감 정보는 Script Properties 환경변수에서 가져와 안전하게 처리
 */

// ====== 환경 변수 ======
// Script Properties에 아래 키/값을 등록
// FIRESTORE_PROJECT = your-project-id
// COLLECTION = your-collection-name
// SERVICE_ACCOUNT_FILE_ID = your-service-account-file-id
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
    .addItem("Delete Missing Data", "triggerDelete")
    .addToUi();
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    syncChangedRows(ss);
    ui.alert("변경 감지 동기화 완료!");
  } catch (err) {
    ui.alert("동기화 실패: " + err.message);
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
    deleteMissingFromFirestore();
    ui.alert("삭제 완료!");
  } catch (err) {
    ui.alert("삭제 실패: " + err.message);
  }
}

// ====== Firestore 키 안전 처리 ======
function sanitizeFirestoreKey(key) {
  if (!key) return "_";
  return key.toString().trim()
    .replace(/[\/#\[\]\s]/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
}

// ====== OAuth2 토큰 생성 ======
function getOAuthToken_() {
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty('FIRESTORE_OAUTH');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.expireAt && parsed.expireAt > Date.now()) return parsed.token;
    } catch(e) {}
  }

  const SERVICE_ACCOUNT_FILE_ID = getConfig("SERVICE_ACCOUNT_FILE_ID");
  const serviceAccount = JSON.parse(
    DriveApp.getFileById(SERVICE_ACCOUNT_FILE_ID).getBlob().getDataAsString()
  );

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

  props.setProperty('FIRESTORE_OAUTH', JSON.stringify({
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

  sheets.forEach(sheet => {
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
    const koCol = header.findIndex(h => (h || "").toString().trim().toLowerCase() === "value_ko");
    const enCol = header.findIndex(h => (h || "").toString().trim().toLowerCase() === "value_en");
    const mnCol = header.findIndex(h => (h || "").toString().trim().toLowerCase() === "value_mn");

    // 이전 값 캐시: Script Properties 활용
    const cacheKey = `sheet_cache_${sheet.getName()}`;
    const cachedStr = PropertiesService.getScriptProperties().getProperty(cacheKey) || "{}";
    const cachedData = JSON.parse(cachedStr);

    const writes = [];
    const newCache = {};

    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      const key = sanitizeFirestoreKey(row[keyCol]);
      if (!key) continue;

      const koVal = koCol >= 0 ? row[koCol] || "" : "";
      const enVal = enCol >= 0 ? row[enCol] || "" : "";
      const mnVal = mnCol >= 0 ? row[mnCol] || "" : "";

      const currentHash = JSON.stringify({ ko: koVal, en: enVal, mn: mnVal });

      // 값 변경 여부 체크
      if (cachedData[key] === currentHash) continue;

      // 변경 감지 → Firestore update 준비
      const docPath = `projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${key}`;
      writes.push({
        update: {
          name: docPath,
          fields: {
            ko: { stringValue: koVal },
            en: { stringValue: enVal },
            mn: { stringValue: mnVal }
          }
        }
      });

      newCache[key] = currentHash;
    }

    // 변경된 행이 있으면 Firestore commit
    if (writes.length > 0) {
      const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:commit`;
      UrlFetchApp.fetch(url, {
        method: "POST",
        contentType: "application/json",
        payload: JSON.stringify({ writes }),
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
    }

    // 새로운 캐시 저장
    PropertiesService.getScriptProperties().setProperty(cacheKey, JSON.stringify({ ...cachedData, ...newCache }));
  });
}

// ====== 삭제 함수 ======
function deleteMissingFromFirestore() {
  const token = getOAuthToken_();
  const FIRESTORE_PROJECT = getConfig("FIRESTORE_PROJECT");
  const COLLECTION = getConfig("COLLECTION");

  const listUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}`;
  const response = UrlFetchApp.fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true
  });
  const json = JSON.parse(response.getContentText());
  if (!json.documents) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetKeys = new Set();
  ss.getSheets().forEach(sheet => {
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

    for (let i = headerRow + 1; i < data.length; i++) {
      const key = sanitizeFirestoreKey(data[i][keyCol]);
      if (key) sheetKeys.add(key);
    }
  });

  json.documents.forEach(doc => {
    const docId = doc.name.split("/").pop();
    if (!sheetKeys.has(docId)) {
      const delUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}`;
      UrlFetchApp.fetch(delUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
    }
  });
}
