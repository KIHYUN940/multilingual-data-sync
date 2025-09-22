import 'package:flutter/material.dart';
import '../models/translation.dart';
import '../services/firestore_service.dart';
import '../widgets/translation_item.dart';

class TranslationScreen extends StatefulWidget {
  const TranslationScreen({super.key});

  @override
  State<TranslationScreen> createState() => _TranslationScreenState();
}

class _TranslationScreenState extends State<TranslationScreen> {
  final FirestoreService _service = FirestoreService();
  String _selectedLang = 'Value_KO'; // 기본 한국어

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("번역 관리"),
        actions: [
          DropdownButton<String>(
            value: _selectedLang,
            items: const [
              DropdownMenuItem(value: 'Value_KO', child: Text("한국어")), // 한국어는 그대로
              DropdownMenuItem(value: 'Value_EN', child: Text("English")), // 영어는 English
              DropdownMenuItem(value: 'Value_MN', child: Text("Монгол")),  // 몽골어는 원어 표시
            ],
            onChanged: (value) {
              setState(() {
                _selectedLang = value!;
              });
            },
          ),
        ],
      ),
      body: StreamBuilder<List<Translation>>(
        stream: _service.getTranslations(),
        builder: (context, snapshot) {
          if (snapshot.hasError) return const Center(child: Text("에러 발생"));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final translations = snapshot.data!;
          return ListView.builder(
            itemCount: translations.length,
            itemBuilder: (context, index) {
              return TranslationItem(
                translation: translations[index],
                lang: _selectedLang,
              );
            },
          );
        },
      ),
    );
  }
}
