# Google Sheets ↔ Firestore 동기화 (Google Apps Script)

이 프로젝트는 **Google Sheets에 입력한 다국어 번역 데이터를 Firestore와 자동 동기화**하는 Google Apps Script 기반 솔루션입니다.  
시트에서 데이터를 수정하면 Firestore에 업로드·갱신되고, **시트에 없는 Key는 Firestore Sync → Delete 버튼을 눌러 DB 데이터를 삭제**할 수 있습니다.  
변경 감지와 캐시 기능으로 불필요한 업데이트를 최소화하고, 속도와 효율성을 개선했습니다.

---

## 기능
- Google Sheets → Firestore **업로드/갱신** (변경 감지 기반)
- Firestore에만 존재하는 문서는 **삭제 가능**
- **Key 위치 자동 감지** (컬럼 순서 자유롭게 변경 가능)
- Firestore 문서 ID 자동 보정 (허용되지 않는 문자 제거)
- **Access Token 캐싱** → 반복 호출 최소화
- **변경 감지 캐시** → 불필요한 업데이트 방지
- Google Sheets 메뉴에 버튼 자동 추가:
  - `Sync Changed Rows` (변경된 행만 업로드/갱신)
  - `Delete Missing Data` (삭제 전용)
- 공유받은 계정도 버튼 클릭으로 동기화 가능 (서비스 계정 사용)

---

## ⚠️ 보안 주의사항
- `serviceAccountKey.json` 같은 **비밀 키 파일은 절대 GitHub에 업로드하지 마세요.**

---

## 사용 방법

### 1. Firestore 준비
1. Firebase 콘솔 → **서비스 계정 키 (`serviceAccountKey.json`)** 생성  
2. 해당 키 파일을 Google Drive에 업로드  
3. 업로드한 파일의 **파일 ID** 확인  
   - Google Drive → 파일 → 공유 링크 복사  
   - 예시:  
     ```
     https://drive.google.com/file/d/FILE_ID/view?usp=sharing
     ```
   - 여기서 `FILE_ID` 부분을 기록해둡니다.

---

### 2. Google Sheets 준비
시트에 아래 컬럼을 포함해야 합니다:

- `Key` (Firestore 문서 ID로 사용됨)
- `Value_KO`, `Value_EN`, `Value_MN` (다국어 값)

> 컬럼 순서는 상관없으며, 스크립트가 자동 탐지합니다.

#### 예시 구조

|   | A                  | B          | C            | D        |
|---|------------------|------------|--------------|----------|
| 1 | Key              | Value_KO   | Value_EN     | Value_MN |
| 2 | homeHearTestTitle | 청력검사   | Hearing Test | Сонсголын сорил |
| 3 | homeHearTestSubtitle1 | 언제,어디서나 | Anytime...   | Хэзээ... |
| 4 | homeHearTestSubtitle2 | 확인해보세요 | Check it out | шалгаарай |

---

### 3. Apps Script 설정 및 배포
1. Google Sheets → **확장 프로그램 → 앱 스크립트** 열기  
2. `Code.gs` 코드 붙여넣기  
3. 상단에서 **저장** 후 `▶ 실행` 클릭  
4. 권한 요청 → Google 계정 인증 허용  
5. 이후, 메뉴에 **Firestore Sync**가 나타납니다.

---

### 4. 환경 변수 설정
Apps Script → **프로젝트 설정 → 스크립트 속성**에서 아래 키/값을 등록합니다:

| Key                     | Value 설명 |
|--------------------------|------------|
| `FIRESTORE_PROJECT`      | Firebase 프로젝트 ID |
| `COLLECTION`             | Firestore 컬렉션 이름 |
| `SERVICE_ACCOUNT_FILE_ID`| Google Drive에 업로드한 `serviceAccountKey.json` 파일 ID |
| `WEBAPP_URL`             | 배포한 Apps Script Web App URL (POST 호출용) |

---

### 5. 실행 방법
Google Sheets 메뉴에서:  
- `Firestore Sync → Sync Changed Rows` → **변경된 행만 업로드/갱신 실행**  
- `Firestore Sync → Delete Missing Data` → **Firestore에서 시트에 없는 Key 삭제**  

---

## 주요 동작 흐름
- **업로드/갱신**:  
  - 시트 데이터 → 변경 감지 → Firestore commit (없으면 생성)
- **삭제**:  
  - Firestore 전체 문서 조회 → 시트에 없는 Key 자동 삭제
- **토큰 관리**:  
  - 서비스 계정 키 기반 OAuth2 토큰 생성  
  - 캐싱 후 재사용 (만료 시 자동 갱신)
- **변경 감지 캐시 관리**:  
  - 이전 값과 비교하여 실제 변경된 행만 업데이트  
  - Script Properties에 `sheet_cache_<시트명>`으로 저장  
  - 불필요한 Firestore 요청 최소화

---

## 공유 계정 지원
1. 시트 소유자가 Apps Script 작성 및 서비스 계정 키 업로드  
2. 시트를 다른 사용자와 공유  
3. 공유 사용자가 `Firestore Sync` 메뉴 클릭  
4. 최초 실행 시 권한 승인 팝업 발생  
5. 승인 후 → 공유 계정도 Firestore 동기화 가능  
   (DB 접근 권한은 서비스 계정을 통해 처리됨)

---

## ⚠️ 주의 사항
- Firestore 문서 ID에는 일부 문자가 허용되지 않음 → 자동 변환됨 (`/ # [] 공백` 등)  
- Key 중복 시, 마지막 데이터가 덮어씌워짐  
- Apps Script `UrlFetchApp` 호출 제한 (분당 30회) 고려 필요  
- 공유 계정 최초 실행 시 권한 승인 필요 (Google Drive / Firestore API 접근 허용)  
- 캐시(`sheet_cache_*`)는 Script Properties에 누적 저장 → 필요 시 수동 정리 가능
