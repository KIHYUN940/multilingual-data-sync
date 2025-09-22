import 'package:flutter/material.dart';
import '../services/firestore_service.dart';
import '../models/translation.dart';

class TranslationManagementScreen extends StatelessWidget {
  const TranslationManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("번역 관리")),
      body: StreamBuilder<List<Translation>>(
        stream: FirestoreService().getTranslations(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final translations = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: translations.map((t) {
              return Card(
                child: ListTile(
                  title: Text(t.id),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("한국어: ${t.getText('Value_KO')}"),
                      Text("English: ${t.getText('Value_EN')}"),
                      Text("Монгол: ${t.getText('Value_MN')}"),
                    ],
                  ),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }
}
