import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/translation.dart';

class FirestoreService {
  final CollectionReference<Map<String, dynamic>> _translations =
      FirebaseFirestore.instance.collection('translations');

  /// 번역 추가 또는 업데이트
  Future<void> addTranslation(Translation translation) async {
    await _translations.doc(translation.id).set(translation.toMap());
  }

  /// 실시간 스트림 (StreamBuilder에서 사용)
  Stream<List<Translation>> getTranslations() {
    return _translations.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => Translation.fromMap(doc.id, doc.data()))
          .toList();
    });
  }

  /// 한 번만 가져오기 (FutureBuilder에서 사용)
  Future<List<Translation>> getTranslationsOnce() async {
    final snapshot = await _translations.get();
    return snapshot.docs
        .map((doc) => Translation.fromMap(doc.id, doc.data()))
        .toList();
  }
}
