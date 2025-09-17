# Google Sheets ↔ Firestore 자동 동기화 (Google Apps Script)

이 프로젝트는 **Google Sheets에 입력한 다국어 번역 데이터를 Firestore와 자동 동기화**하는 Google Apps Script 기반 솔루션입니다.  
시트에서 데이터를 수정하면 Firestore에 업로드·갱신되고, **시트에 없는 Key는 Firestore Sync → Delete 버튼으로 삭제**할 수 있습니다.  
또한 **변경 감지 + 시트별 캐시 관리**를 통해 불필요한 업데이트를 최소화하고, 속도와 효율성을 크게 개선했습니다.

---

## 주요 기능
- Google Sheets → Firestore **업로드/갱신** (변경 감지 기반)
- Firestore에만 존재하는 문서는 **삭제 가능**
- **Key 위치 자동 탐지** (컬럼 순서 자유롭게 변경 가능)
- Firestore 문서 ID 자동 보정 (허용되지 않는 문자 제거)
- **Access Token 캐싱** → 반복 호출 최소화
- **변경 감지 캐시 (시트별 관리)**  
  - 불필요한 업데이트 방지  
  - 삭제된 Key만 해당 시트 캐시에서 제거
- Google Sheets 메뉴 버튼 자동 추가:
  - `Sync Changed Rows` (변경된 행만 업로드/갱신)
  - `Delete Missing Data` (삭제 전용)
- **공유 계정 지원** → 서비스 계정으로 Firestore 접근

---

## ⚠️ 보안 주의사항
- `serviceAccountKey.json` 등 **비밀 키 파일은 절대 GitHub에 업로드하지 마세요.**

---

## 사용 방법

### 1. Firestore 준비
1. Firebase 콘솔 → **서비스 계정 키 (`serviceAccountKey.json`)** 생성  
2. Google Drive에 업로드  
3. 업로드한 파일의 **파일 ID** 확인  
   - Google Drive → 파일 → 공유 링크 복사  
   - 예시: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`  
   - `FILE_ID` 부분 기록

---

### 2. Google Sheets 준비
시트 컬럼 예시:

| Key                  | Value_KO   | Value_EN     | Value_MN |
|---------------------|------------|--------------|----------|
| homeHearTestTitle    | 청력검사   | Hearing Test | Сонсголын сорил |
| homeHearTestSubtitle1| 언제,어디서나 | Anytime...   | Хэзээ... |
| homeHearTestSubtitle2| 확인해보세요 | Check it out | шалгаарай |

> 컬럼 순서는 자유롭게 변경 가능하며, 스크립트가 자동 탐지합니다.

---

### 3. Apps Script 설정 및 배포
1. Google Sheets → **확장 프로그램 → 앱 스크립트** 열기  
2. `Code.gs` 코드 붙여넣기  
3. 상단에서 **저장 → 실행**  
4. 권한 요청 → Google 계정 인증 허용  
5. 메뉴에 **Firestore Sync** 추가 확인

---

### 4. 환경 변수 설정
Apps Script → **프로젝트 설정 → 스크립트 속성**에서 등록:

| Key                     | Value 설명 |
|--------------------------|------------|
| `FIRESTORE_PROJECT`      | Firebase 프로젝트 ID |
| `COLLECTION`             | Firestore 컬렉션 이름 |
| `SERVICE_ACCOUNT_FILE_ID`| Google Drive에 업로드한 `serviceAccountKey.json` 파일 ID |
| `WEBAPP_URL`             | 배포한 Apps Script Web App URL (POST 호출용) |

---

### 5. 실행 방법
Google Sheets 메뉴:

- `Firestore Sync → Sync Changed Rows` → 변경된 행만 업로드/갱신  
- `Firestore Sync → Delete Missing Data` → Firestore에서 시트에 없는 Key 삭제  

---

## 동작 흐름
1. **업로드/갱신**
   - 시트 데이터 → 변경 감지 → Firestore commit  
   - 없으면 생성, 있으면 갱신

2. **삭제**
   - Firestore 전체 문서 조회 → 시트에 없는 Key 삭제  
   - 삭제된 Key는 **해당 시트 캐시에서만 제거** → 전체 캐시 초기화 없음

3. **토큰 관리**
   - 서비스 계정 키 기반 OAuth2 토큰 생성  
   - 캐싱 후 재사용 (만료 시 자동 갱신)

4. **변경 감지 캐시**
   - Script Properties에 `sheet_cache_<시트명>` 저장  
   - 삭제된 Key만 캐시에서 제거 → 재입력 시 정상 저장  
   - 불필요한 Firestore 요청 최소화

---

## 공유 계정 지원
1. 시트 소유자가 Apps Script 작성 + 서비스 계정 키 업로드  
2. 다른 사용자와 시트 공유  
3. 공유 사용자가 메뉴 클릭 → 권한 승인  
4. 승인 후 → 공유 계정도 Firestore 동기화 가능  
   - DB 접근 권한은 **서비스 계정으로 처리**

---

## ⚠️ 주의 사항
- Firestore 문서 ID에는 일부 문자가 허용되지 않음 → 자동 변환 (`/ # [] 공백` 등)  
- Key 중복 시 → 마지막 데이터가 덮어쓰기됨  
- Apps Script `UrlFetchApp` 호출 제한 (분당 30회) 고려 필요  
- 공유 계정 최초 실행 시 권한 승인 필요 (Google Drive / Firestore API 접근)  
- 캐시(`sheet_cache_*`)는 시트별 관리 → 삭제 시 해당 Key만 제거되어 성능 최적화
