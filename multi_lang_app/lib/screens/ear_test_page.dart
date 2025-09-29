import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'hearing_total_page_a1.dart';
import '../widgets/language_dropdown.dart';
import '../providers/language_provider.dart';
import '../services/firestore_service.dart';
import '../models/translation.dart';

class EarTestPage extends StatelessWidget {
  const EarTestPage({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    // Provider에서 언어 가져오기
    final languageProvider = Provider.of<LanguageProvider>(context);
    final selectedLanguage = languageProvider.selectedLanguage;

    return Scaffold(
      appBar: AppBar(title: const Text("청력 검사")),
      body: StreamBuilder<List<Translation>>(
        stream: FirestoreService().getTranslations(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final translations = snapshot.data ?? [];

          String getText(String key) {
            try {
              final t = translations.firstWhere(
                (t) => t.id == key,
                orElse: () => Translation(id: key, values: {}),
              );
              return t.getText(selectedLanguage) ?? '';
            } catch (e) {
              return '';
            }
          }

          final items = [
            {
              "title": getText("hearingSelect_002"),
              "subtitle": getText("hearingSelect_003"),
              "action": () {
                // TODO: 종합 청력검사 페이지 연결
              }
            },
            {
              "title": getText("hearingSelect_004"),
              "subtitle": getText("hearingSelect_007"),
              "action": () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => HearingTotalPageA1(),
                  ),
                );
              }
            },
            {
              "title": getText("hearingSelect_010"),
              "subtitle": "",
              "action": () {},
            },
            {
              "title": getText("hearingSelect_014"),
              "subtitle": getText("hearingSelect_015"),
              "action": () {},
            },
          ];

          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index];

                    final VoidCallback action =
                        (item['action'] as VoidCallback?) ?? () {};

                    return Card(
                      margin: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      child: SizedBox(
                        height: 120,
                        child: ListTile(
                          title: Text(
                            item["title"] as String,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF4A148C), // Colors.deepPurple.shade700
                              fontSize: 18,
                            ),
                          ),
                          subtitle: Text(item["subtitle"] as String),
                          trailing: const Icon(Icons.arrow_forward_ios),
                          onTap: action,
                        ),
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: LanguageDropdown(
                  selectedLanguage: selectedLanguage,
                  onChanged: (value) {
                    languageProvider.setLanguage(value!);
                  },
                  width: screenWidth / 4,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
