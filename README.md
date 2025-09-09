# Google Sheets ↔ Firestore 동기화 (Google Apps Script)

이 프로젝트는 **Google Sheets에 입력한 다국어 번역 데이터를 Firestore와 자동 동기화**하는 Google Apps Script 프로젝트입니다.  
엑셀/구글 시트에서 데이터 변경 시 Firestore가 업데이트되고, Firestore에는 없는 Key는 자동으로 삭제됩니다.

---

## 기능
- Google Sheets에서 데이터 읽기
- Firestore에 번역 데이터 업로드/갱신
- Firestore에만 존재하는 문서는 자동 삭제
- "Key 위치"를 시트에서 자동 탐지하여 안전하게 처리

---

> ⚠️ `serviceAccountKey.json` 같은 **비밀 키 파일은 절대 GitHub에 업로드하지 마세요.**

---

## 사용 방법

### 1. Firestore 준비
1. Firebase 콘솔에서 **서비스 계정 키 (serviceAccountKey.json)** 생성
2. Google Drive에 `serviceAccountKey.json` 업로드
3. 업로드한 파일의 **파일 ID** 확인  
   - Google Drive → 해당 파일 → `공유 링크` 복사  
   - 예:  
     ```
     https://drive.google.com/file/d/FILE_ID/view?usp=sharing
     ```
     여기서 `FILE_ID` 부분을 복사해둡니다.

---

### 2. Google Sheets 준비
시트에 반드시 아래 컬럼을 포함해야 합니다. 

- `Key` (Firestore 문서 ID로 사용됨)
- `Value_KO`, `Value_EN`, `Value_MN` (번역 값)

컬럼 순서는 상관없으며, 스크립트가 자동 감지합니다.  
- 구조 :

|   | A        | B          | C            | D        |
|---|----------|------------|--------------|----------|
| 1 | Key      | Value_KO   | Value_EN     | Value_MN |
| 2 | homeHearTestTitle | 청력검사   | Hearing Test | Сонсголын сорил |
| 3 | homeHearTestSubtitle1 | 언제,어디서나 | Anytime...   | Хэзээ... |
| 4 | homeHearTestSubtitle2 | 확인해보세요 | Check it out | шалгаарай |

---

### 3. Apps Script 배포
1. Google Sheets → **확장 프로그램 → 앱 스크립트** 열기
2. `Code.gs` 내용 복사하여 붙여넣기
3. 상단에서 **저장** 후 `▶ 실행` 버튼 클릭
4. 권한 요청 → Google 계정 인증 허용
5. 실행 후, Firestore와 자동으로 동기화됩니다.

---

### 4. 환경 변수 설정
`Code.gs` 내부에 아래 값 수정:

```js
const FIRESTORE_PROJECT = "your-project-id";  // Firebase 프로젝트 ID
const COLLECTION = "translations";            // Firestore 컬렉션 이름
const SERVICE_ACCOUNT_FILE_ID = "YOUR_FILE_ID"; // Drive에 업로드한 serviceAccountKey.json ID

```
---

## 5. 실행 방법
Google Sheets 메뉴에서 `Firestore Sync → Sync Sheets to Firestore` 클릭  

동기화 작업이 수행되며:
- 시트의 데이터 → Firestore 업로드/갱신  
- 시트에 없는 Key → Firestore에서 삭제  

---

## 6. 주요 기능
- **Key 컬럼 자동 감지** → 열 순서 자유롭게 변경 가능  
- **Firestore 문서 ID 자동 보정** → 허용되지 않는 문자(`/`, `#`, `[]`, 공백, 한글 등) 제거  
- **Service Account Key 보안 처리** → Google Drive에서 안전하게 로드  
- **토큰 캐싱 지원** → Access Token 재발급 최소화  
- **동기화 완료 시 알림 표시**
- **공유 계정도 동기화 가능**  
  - 최초 실행 시 Google Drive/Spreadsheet 접근 권한 승인 필요  
  - 승인 후에는 공유 계정이 버튼을 눌러도 Firestore에 데이터 저장 가능 (실제 DB 접근 권한은 serviceAccount 사용)

---

## 7. 주의 사항
- ⚠️ Firestore 문서 ID에는 일부 문자가 허용되지 않음 → 자동 변환됨  
- ⚠️ Key 중복 시 마지막 데이터가 덮어씌워짐  
- ⚠️ Apps Script의 `UrlFetchApp` 호출 제한(분당 30회)을 고려해야 함  
- ⚠️ 공유받은 사용자는 처음 실행 시 권한 승인 팝업이 표시됨  
  - 이 승인은 **Apps Script가 Google Drive/Firestore API에 접근하는 것을 허용하기 위함**  
  - 한 번 승인하면 이후에는 추가 승인 없이 버튼 실행 가능  

---

## 8. 공유 계정 동작 흐름
1. 시트 소유자가 Apps Script를 작성하고, `serviceAccountKey.json`을 Drive에 업로드  
2. 시트를 다른 사용자와 공유  
3. 공유받은 사용자가 `Firestore Sync → Sync Sheets to Firestore` 메뉴 클릭  
4. **최초 실행 시** → 권한 승인 요청 (Google API 사용 허용)  
5. **승인 후** → 공유 계정도 동일하게 Firestore에 동기화 가능  

---

