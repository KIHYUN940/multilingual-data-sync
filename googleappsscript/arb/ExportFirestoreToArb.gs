/**
 * Firestore → .arb 파일 변환기 (Translations + Survey 모두 지원)
 * 언어 동적 처리: Value_*, Text_*, Options_* 필드를 자동 인식
 * 새로운 언어 추가 시 코드 수정 없이 자동 처리
 * Flutter 표준 ARB 구조: @@locale 포함
 * 각 언어별 app_<lang>.arb 생성
 */

// ===== 환경 변수 =====
function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);
  if (!value) throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
  return value;
}

// 환경 변수 예시
// FIRESTORE_PROJECT : Firestore 프로젝트 ID
// COLLECTION        : 변환할 컬렉션 이름
// ARB_FOLDER_ID     : 구글 드라이브 ARB 파일 저장 폴더 ID
// SERVICE_ACCOUNT_FILE_ID : 서비스 계정 JSON 파일 ID (Drive에 업로드)

// ===== 메인 함수 =====
function generateArbFiles() {
  const FIRESTORE_PROJECT = getConfig("FIRESTORE_PROJECT");
  const COLLECTION = getConfig("COLLECTION");
  const folderId = getConfig("ARB_FOLDER_ID");
  const folder = DriveApp.getFolderById(folderId);

  const token = getOAuthToken_();
  let pageToken = null;

  const arbData = {}; // 언어 동적 처리

  do {
    // Firestore REST API 호출
    let url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${COLLECTION}?pageSize=1000`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200)
      throw new Error(`Firestore 요청 실패: ${response.getResponseCode()} - ${response.getContentText()}`);

    const json = JSON.parse(response.getContentText());
    const docs = json.documents || [];

    docs.forEach(doc => {
      if (!doc.fields) return;
      const fields = doc.fields;

      // 문서 ID 또는 Key를 ARB key로 사용
      const key = getFieldValue(fields.Key) || doc.name.split("/").pop();
      if (!key) return;

      // ===== 동적 언어 처리 =====
      for (const fieldName in fields) {
        const match = fieldName.match(/^(Value|Text|Options)_(.+)$/);
        if (!match) continue;
        const type = match[1];         // Value / Text / Options
        const lang = match[2].toLowerCase(); // ko, en, mn, jp 등

        if (!arbData[lang]) arbData[lang] = {};

        const val = getFieldValue(fields[fieldName]);
        const keyName = type === "Options" ? key + "_options" : key;

        arbData[lang][keyName] = val;
      }
    });

    pageToken = json.nextPageToken || null;
  } while (pageToken);

  // ===== ARB 파일 저장 =====
  for (const lang in arbData) {
    const dataWithLocale = { "@@locale": lang, ...arbData[lang] }; // @@locale 포함
    saveArbFile(folder, `app_${lang}.arb`, dataWithLocale);
  }

  Logger.log("Firestore → ARB 변환 완료! 생성된 언어: " + Object.keys(arbData).join(", "));
}

// ===== 필드 값 안전 추출 =====
function getFieldValue(field) {
  if (!field) return "";
  const types = ["stringValue", "integerValue", "doubleValue", "booleanValue"];
  for (let t of types) {
    if (field[t] !== undefined && field[t] !== null) return field[t].toString();
  }
  return "";
}

// ===== 파일 덮어쓰기 =====
function saveArbFile(folder, fileName, data) {
  const jsonString = JSON.stringify(data, null, 2);
  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    const file = existing.next();
    file.setContent(jsonString);
  } else {
    folder.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);
  }
}

// ===== JWT 인증 =====
function getOAuthToken_() {
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

  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: body,
    muteHttpExceptions: true
  };

  const tokenResponse = UrlFetchApp.fetch(serviceAccount.token_uri, options);
  if (tokenResponse.getResponseCode() !== 200) {
    throw new Error(`토큰 요청 실패: ${tokenResponse.getResponseCode()} - ${tokenResponse.getContentText()}`);
  }

  const data = JSON.parse(tokenResponse.getContentText());
  return data.access_token;
}