/**
 * Firestore와 Google Sheets 동기화 (웹앱 + 소유자 권한 실행)
 * 공유 계정도 버튼을 눌러 동기화 가능
 * 민감 정보는 Script Properties 환경변수에서 가져와 안전하게 처리
 */

// ====== 환경 변수 ======
// Script Properties에 아래 키/값을 등록
// FIRESTORE_PROJECT = your-project-id
// COLLECTION = your-collection-name
// SERVICE_ACCOUNT_FILE_ID = your-service-account-file-id
// WEBAPP_URL = your-webapp-url

// ====== 헬퍼: 환경변수 가져오기 ======
function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);
  if (!value) throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
  return value;
}

// ====== 시트 메뉴 생성 ======
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Firestore Sync")
    .addItem("Sync Sheets to Firestore", "triggerSync")
    .addToUi();
}

// ====== 메뉴 클릭 시 Firestore 동기화 ======
function triggerSync() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "Firestore 동기화",
    "시트 내용을 Firestore에 동기화하시겠습니까?",
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const payload = { sheetId: ssId };
    const WEBAPP_URL = getConfig("WEBAPP_URL");

    const res = UrlFetchApp.fetch(WEBAPP_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const content = res.getContentText();

    Logger.log("HTTP Code: " + code);
    Logger.log("Response: " + content);

    let json;
    try {
      json = JSON.parse(content);
    } catch(e) {
      ui.alert("동기화 실패: 서버가 JSON이 아닌 값을 반환했습니다.\n" + content);
      return;
    }

    if (code === 200 && json.status === "success") {
      ui.alert("Firestore 동기화 완료!");
    } else {
      ui.alert("동기화 실패: " + (json.error || content));
    }

  } catch (err) {
    ui.alert("동기화 요청 실패: " + err.message);
  }
}

// ====== 웹앱 GET → 테스트용 ======
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "ready", message: "POST 요청으로 시트를 동기화하세요." })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ====== 웹앱 POST → Firestore 동기화 ======
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheetId = body.sheetId;
    const ss = SpreadsheetApp.openById(sheetId);
    syncAllSheetsToFirestore(ss);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success" })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
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

// ====== Firestore 동기화 함수 ======
function syncAllSheetsToFirestore(ss) {
  const sheets = ss.getSheets();
  const sheetKeys = new Set();
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

    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      let key = sanitizeFirestoreKey(row[keyCol]);
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
      } catch (err) {
        Logger.log(`Error uploading ${key}: ${err}`);
      }
    }
  });

  // Firestore 삭제 처리
  const listUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}`;
  const response = UrlFetchApp.fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true
  });
  const json = JSON.parse(response.getContentText());
  if (json.documents) {
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
}
