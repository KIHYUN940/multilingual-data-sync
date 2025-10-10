import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/translation.dart';
import '../models/user_info.dart';

class FirestoreService {
  // translations 컬렉션 (설문 질문/옵션 + UI 문자열)
  final CollectionReference<Map<String, dynamic>> _translations =
      FirebaseFirestore.instance.collection('translations');

  // responses 컬렉션 (유저 응답)
  final CollectionReference<Map<String, dynamic>> _responses =
      FirebaseFirestore.instance.collection('responses');

  /// 번역 추가 또는 업데이트
  Future<void> addTranslation(Translation translation) async {
    await _translations.doc(translation.id).set(translation.toMap());
  }

  /// -----------------------------
  /// 전체 번역 조회 (UI 문자열 + 설문 포함)
  /// StreamBuilder에서 사용
  /// -----------------------------
  Stream<List<Translation>> getTranslations() {
    return _translations.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => Translation.fromMap(doc.id, doc.data()))
          .toList();
    });
  }

  /// 전체 번역 한 번만 조회 (FutureBuilder에서 사용)
  Future<List<Translation>> getTranslationsOnce() async {
    final snapshot = await _translations.get();
    return snapshot.docs
        .map((doc) => Translation.fromMap(doc.id, doc.data()))
        .toList();
  }

  /// -----------------------------
  /// 특정 surveyId 기준 설문 데이터만 조회
  /// StreamBuilder에서 사용
  /// -----------------------------
  Stream<List<Translation>> getSurveyTranslations(String surveyId) {
    return _translations
        .where('surveyId', isEqualTo: surveyId)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => Translation.fromMap(doc.id, doc.data()))
              .toList();
        });
  }

  /// 특정 surveyId 기준 설문 데이터 한 번만 조회
  /// FutureBuilder에서 사용
  Future<List<Translation>> getSurveyTranslationsOnce(String surveyId) async {
    final snapshot =
        await _translations.where('surveyId', isEqualTo: surveyId).get();
    return snapshot.docs
        .map((doc) => Translation.fromMap(doc.id, doc.data()))
        .toList();
  }

  /// -----------------------------
  /// 유저 응답 저장
  /// - user.id가 비어있으면 Firestore에서 자동 doc 생성
  /// - 저장 후 실제 doc id 반환
  /// -----------------------------
  Future<String> saveUserResponse(
      UserInfo user, Map<String, dynamic> answers) async {
    DocumentReference<Map<String, dynamic>> docRef;

    if (user.id.isNotEmpty) {
      // 기존 유저이면 doc id로 업데이트
      docRef = _responses.doc(user.id);
    } else {
      // 신규 유저이면 Firestore 자동 id 생성
      docRef = _responses.doc();
    }

    await docRef.set({
      ...user.toMap(),
      'answers': answers,
      'timestamp': FieldValue.serverTimestamp(),
    });

    return docRef.id; // 저장된 doc id 반환
  }

  /// -----------------------------
  /// 특정 유저 응답 가져오기
  /// -----------------------------
  Future<Map<String, dynamic>?> getUserResponse(String userId) async {
    final doc = await _responses.doc(userId).get();
    return doc.exists ? doc.data() : null;
  }
}
