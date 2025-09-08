/**
 * Firestore와 Google Sheets 동기화 (업데이트 + 삭제)
 * 시트 이름 상관없이 반복 처리, Key 위치 자동 감지
 * Firestore 문서 ID 안전하게 변환
 * serviceAccountKey.json을 Drive에서 안전하게 읽기
 */

// ====== 환경 변수 (README에서 설정 방법 안내) ======
const FIRESTORE_PROJECT = PropertiesService.getScriptProperties().getProperty("FIRESTORE_PROJECT"); // Firebase 프로젝트 ID
const COLLECTION = PropertiesService.getScriptProperties().getProperty("COLLECTION"); // Firestore 컬렉션 이름
const SERVICE_ACCOUNT_FILE_ID = PropertiesService.getScriptProperties().getProperty("SERVICE_ACCOUNT_FILE_ID"); // Drive에 업로드한 serviceAccountKey.json ID

// ====== 메뉴 생성 ======
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Firestore Sync")
    .addItem("Sync Sheets to Firestore", "syncAllSheetsToFirestore")
    .addToUi();
}

// ====== Firestore 키 유효성 검증(보정) ======
function sanitizeFirestoreKey(key) {
  if (!key) return "_"; // 빈 값 방지
  return key
    .toString()
    .trim()
    .replace(/[\/#\[\]\s]/g, "_") // 허용되지 않는 문자 치환
    .replace(/[^a-zA-Z0-9_\-]/g, ""); // 알파벳, 숫자, _,- 외 제거
}

// ====== OAuth2 토큰 생성 ======
function getOAuthToken_() {
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty("FIRESTORE_OAUTH");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.expireAt && parsed.expireAt > Date.now()) {
        return parsed.token; // 캐시된 토큰 사용
      }
    } catch (e) {
      /* 무시하고 재발급 */
    }
  }

  // service account JSON 읽기
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
    iat: now,
  };

  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signatureBytes = Utilities.computeRsaSha256Signature(signingInput, privateKey);
  const encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes);
  const signedJwt = `${signingInput}.${encodedSignature}`;

  const body =
    "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" +
    "&assertion=" +
    encodeURIComponent(signedJwt);

  const options = {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: body,
    muteHttpExceptions: true,
  };

  const tokenResponse = UrlFetchApp.fetch(serviceAccount.token_uri, options);
  const code = tokenResponse.getResponseCode();
  const txt = tokenResponse.getContentText();

  if (code !== 200) {
    throw new Error(`Token request failed: ${code} - ${txt}`);
  }

  const data = JSON.parse(txt);
  const token = data.access_token;
  // expires_in을 사용해 사전 만료(여유 60초) 처리
  const expiresIn = data.expires_in || 3600;
  props.setProperty(
    "FIRESTORE_OAUTH",
    JSON.stringify({
      token: token,
      expireAt: Date.now() + (expiresIn - 60) * 1000,
    })
  );

  return token;
}

// ====== 메인 동기화 함수 ======
function syncAllSheetsToFirestore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sheetKeys = new Set();
  const token = getOAuthToken_();

  sheets.forEach((sheet) => {
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return;

    // 1. Key 열과 헤더 행 찾기
    let keyCol = -1,
      headerRow = -1;
    outerLoop: for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        if ((data[r][c] || "").toString().trim().toLowerCase() === "key") {
          keyCol = c;
          headerRow = r;
          break outerLoop;
        }
      }
    }

    if (keyCol === -1) {
      Logger.log(`Key 열을 찾을 수 없습니다: ${sheet.getName()}`);
      return;
    }

    // 2. 헤더 기준 Value 열 자동 감지
    const header = data[headerRow];
    const koCol = header.findIndex(
      (h) => (h || "").toString().trim().toLowerCase() === "value_ko"
    );
    const enCol = header.findIndex(
      (h) => (h || "").toString().trim().toLowerCase() === "value_en"
    );
    const mnCol = header.findIndex(
      (h) => (h || "").toString().trim().toLowerCase() === "value_mn"
    );

    // 3. 데이터 처리 (헤더 다음 행부터)
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      let key = sanitizeFirestoreKey(row[keyCol]);
      if (!key) continue;
      sheetKeys.add(key);

      const docData = {
        fields: {
          ko: { stringValue: koCol >= 0 ? row[koCol] || "" : "" },
          en: { stringValue: enCol >= 0 ? row[enCol] || "" : "" },
          mn: { stringValue: mnCol >= 0 ? row[mnCol] || "" : "" },
        },
      };

      const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${key}`;

      try {
        const response = UrlFetchApp.fetch(url, {
          method: "PATCH",
          contentType: "application/json",
          payload: JSON.stringify(docData),
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true,
        });

        // 문서가 없으면 POST로 생성
        if (response.getResponseCode() === 404) {
          const createUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}?documentId=${key}`;
          UrlFetchApp.fetch(createUrl, {
            method: "POST",
            contentType: "application/json",
            payload: JSON.stringify(docData),
            headers: { Authorization: `Bearer ${token}` },
            muteHttpExceptions: true,
          });
        }
      } catch (err) {
        Logger.log(`Error uploading ${key}: ${err}`);
      }
    }
  });

  // 4. Firestore에서 삭제 처리
  const listUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}`;
  const response = UrlFetchApp.fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true,
  });

  const json = JSON.parse(response.getContentText());
  if (json.documents) {
    json.documents.forEach((doc) => {
      const docId = doc.name.split("/").pop(); //Firestore 문서의 실제 키값 추출
      if (!sheetKeys.has(docId)) {
        const delUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}`;
        UrlFetchApp.fetch(delUrl, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true,
        });
      }
    });
  }

  SpreadsheetApp.getUi().alert("Firestore sync completed!");
}
