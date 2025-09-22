import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/translation.dart';

class FirestoreService {
  final CollectionReference<Map<String, dynamic>> translations =
      FirebaseFirestore.instance.collection('translations');

  Future<void> addTranslation(Translation translation) async {
    await translations.doc(translation.id).set(translation.toMap());
  }

  Stream<List<Translation>> getTranslations() {
    return translations.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => Translation.fromMap(doc.id, doc.data()))
          .toList();
    });
  }
}
