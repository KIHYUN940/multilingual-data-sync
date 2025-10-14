/**
 * ===============================
 * 폴더 기반 자동 탐색 + Key별 Firestore 업로드
 * ===============================
 * - Google Drive 폴더 안 .arb 파일 자동 탐색
 * - 각 Key를 Firestore Document ID로 사용
 * - Document 안에 Value_KO / Value_EN / Value_MN 필드 저장
 * - ARB_FOLDER_ID를 환경변수에서 가져오도록 변경
 * - 기존 getConfig(), getOAuthToken_() 재사용
 */

/**
 * 환경 변수
 * Script Properties
 * FIRESTORE_PROJECT = your-project-id
 * COLLECTION = translations
 * SERVICE_ACCOUNT_FILE_ID = 서비스 계정 JSON 파일 ID
 * ARB_FOLDER_ID = .arb 파일이 들어있는 Google Drive 폴더 ID
 */

/**
 * Firestore 업로드 메인 함수
 */
function uploadArbFolderToFirestore() {
  const projectId = getConfig("FIRESTORE_PROJECT");
  const collectionName = getConfig("COLLECTION");
  const folderId = getConfig("ARB_FOLDER_ID");

  // 폴더에서 .arb 파일 가져오기
  const folder = DriveApp.getFolderById(folderId);
  const filesIterator = folder.getFiles();

  const mergedData = {}; // { key: {Value_KO: "", Value_EN: "", Value_MN: ""} }

  while (filesIterator.hasNext()) {
    const file = filesIterator.next();
    const name = file.getName();
    if (!name.endsWith(".arb")) continue;

    // 파일명에서 locale 추출: app_ko.arb -> ko
    const localeMatch = name.match(/_([a-z]{2})\.arb$/i);
    if (!localeMatch) continue;
    const locale = localeMatch[1].toLowerCase();

    const content = JSON.parse(file.getBlob().getDataAsString("utf-8"));

    for (const key in content) {
      if (key.startsWith("@")) continue; // 메타데이터 제외
      if (!mergedData[key]) mergedData[key] = {};
      // 필드 이름을 Value_LOCALE 형식으로 변경
      const fieldName = `Value_${locale.toUpperCase()}`;
      mergedData[key][fieldName] = content[key] || "";
    }
  }

  // Firestore에 Key별 Document 업로드
  const token = getOAuthToken_();

  for (const key in mergedData) {
    const fields = Object.entries(mergedData[key]).reduce((acc, [fieldName, value]) => {
      acc[fieldName] = { stringValue: value.toString() };
      return acc;
    }, {});

    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${key}`;

    try {
      const response = UrlFetchApp.fetch(docUrl, {
        method: "PATCH", // 없으면 생성, 있으면 덮어쓰기
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify({ fields }),
        muteHttpExceptions: true
      });
      Logger.log(`[${key}] 업로드 완료: ${response.getContentText()}`);
    } catch (e) {
      Logger.log(`[${key}] 업로드 실패: ${e}`);
    }
  }

  Logger.log("ARB 폴더 전체 업로드 완료!");
}

/**
 * ===============================
 * 기존 getConfig() / getOAuthToken_() 재사용
 * ===============================
 */

function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);
  if (!value) throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
  return value;
}

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

  PropertiesService.getScriptProperties().setProperty('FIRESTORE_OAUTH', JSON.stringify({
    token: token,
    expireAt: Date.now() + (expiresIn - 60) * 1000
  }));

  return token;
}