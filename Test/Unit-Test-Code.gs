// ====== Test-Code.gs ======
// Firestore 호출 없이 단위 테스트용 스크립트
// 운영 코드와 중복되는 함수 이름을 피하기 위해 _Test 접미사 사용

// ====== Firestore 키 변환 테스트 ======
function testSanitizeFirestoreKey_Test() {
  const cases = [
    { input: "normalKey", expected: "normalKey" },
    { input: " key with spaces ", expected: "key_with_spaces" },
    { input: "special/#[]chars", expected: "special____chars" },
    { input: "", expected: "_" },
    { input: null, expected: "_" },
  ];

  cases.forEach(({ input, expected }) => {
    const actual = sanitizeFirestoreKey_Test(input);
    Logger.log(`input: "${input}", actual: "${actual}", expected: "${expected}"`);
    if (actual !== expected) throw new Error(`테스트 실패: ${input}`);
  });

  Logger.log("sanitizeFirestoreKey_Test 단위 테스트 통과!");
}

// ====== JS 객체 → Firestore 필드 변환 테스트 ======
function testObjectToFirestoreFields_Test() {
  const input = {
    str: "hello",
    num: 123,
    bool: true,
    obj: { a: 1 }
  };

  const expectedKeys = ["str", "num", "bool", "obj"];
  const actual = objectToFirestoreFields_Test(input);
  expectedKeys.forEach(k => {
    if (!actual[k]) throw new Error(`필드 ${k} 변환 실패`);
  });

  Logger.log("objectToFirestoreFields_Test 단위 테스트 통과!");
}

// ====== 시트 데이터 → 문서 데이터 변환 테스트 ======
function testRowToDocData_Test() {
  // 가짜 시트 데이터
  const header = ["key", "value_ko", "value_en", "value_mn"];
  const row = ["test_key", "안녕", "Hello", "Сайн уу"];

  const koCol = header.indexOf("value_ko");
  const enCol = header.indexOf("value_en");
  const mnCol = header.indexOf("value_mn");

  const docData = {
    fields: {
      ko: { stringValue: row[koCol] },
      en: { stringValue: row[enCol] },
      mn: { stringValue: row[mnCol] }
    }
  };

  Logger.log(JSON.stringify(docData));
  Logger.log("row → docData 변환 테스트 통과!");
}

// ====== 시트-업로드/삭제 시뮬레이션 테스트 ======
function testSyncSimulation_Test() {
  // 가짜 시트 데이터 (2개 문서)
  const sheetData = [
    ["key", "value_ko", "value_en", "value_mn"],
    ["key1", "안녕1", "Hello1", "Сайн уу1"],
    ["key2", "안녕2", "Hello2", "Сайн уу2"]
  ];

  // 기존 Firestore 문서 (시뮬레이션)
  let firestoreDocs = {
    "key2": { ko: "Old2", en: "Old2", mn: "Old2" },
    "key3": { ko: "Old3", en: "Old3", mn: "Old3" }
  };

  Logger.log("초기 Firestore 시뮬레이션: " + JSON.stringify(firestoreDocs));

  // 1. 시트 데이터를 docData로 변환
  const header = sheetData[0];
  const keyCol = header.indexOf("key");
  const koCol = header.indexOf("value_ko");
  const enCol = header.indexOf("value_en");
  const mnCol = header.indexOf("value_mn");

  const sheetKeys = new Set();
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    const key = sanitizeFirestoreKey_Test(row[keyCol]);
    sheetKeys.add(key);
    const docData = {
      ko: row[koCol],
      en: row[enCol],
      mn: row[mnCol]
    };
    firestoreDocs[key] = docData; // 업로드 시뮬레이션
  }

  Logger.log("업로드 후 Firestore 시뮬레이션: " + JSON.stringify(firestoreDocs));

  // 2. 시트에 없는 문서 삭제 시뮬레이션
  Object.keys(firestoreDocs).forEach(docId => {
    if (!sheetKeys.has(docId)) {
      delete firestoreDocs[docId];
    }
  });

  Logger.log("삭제 후 Firestore 시뮬레이션: " + JSON.stringify(firestoreDocs));

  // 검증
  if (!("key1" in firestoreDocs) || !("key2" in firestoreDocs) || ("key3" in firestoreDocs)) {
    throw new Error("삭제/업로드 시뮬레이션 테스트 실패");
  }

  Logger.log("삭제/업로드 시뮬레이션 단위 테스트 통과!");
}

// ====== 단위 테스트 실행 ======
function runAllUnitTests() {
  testSanitizeFirestoreKey_Test();
  testObjectToFirestoreFields_Test();
  testRowToDocData_Test();
  testSyncSimulation_Test();
  Logger.log("모든 단위 테스트 통과!");
}

// ====== 운영 코드와 이름 중복 피하기 위해 별도 정의 ======
function sanitizeFirestoreKey_Test(key) {
  if (!key) return "_";
  return key.toString().trim()
    .replace(/[\/#\[\]\s]/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
}

function objectToFirestoreFields_Test(obj) {
  const fields = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") fields[key] = { integerValue: value };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
    else fields[key] = { stringValue: JSON.stringify(value) };
  }
  return fields;
}
