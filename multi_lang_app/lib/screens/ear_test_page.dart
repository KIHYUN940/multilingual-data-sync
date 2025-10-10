import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/language_dropdown.dart';
import '../providers/language_provider.dart';
import '../providers/real_time_provider.dart';
import '../services/firestore_service.dart';
import '../models/translation.dart';
import 'user_info_screen.dart';

class EarTestPage extends StatefulWidget {
  const EarTestPage({super.key});

  @override
  State<EarTestPage> createState() => _EarTestPageState();
}

class _EarTestPageState extends State<EarTestPage> {
  Future<List<Translation>>? _cachedFuture; // 캐싱용 Future

  @override
  void initState() {
    super.initState();
    _cachedFuture = FirestoreService().getTranslationsOnce(); // 최초 1회만 실행
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final languageProvider = Provider.of<LanguageProvider>(context);
    final selectedLanguage = languageProvider.selectedLanguage;

    final realTimeProvider = context.watch<RealTimeProvider>();
    final isRealTime = realTimeProvider.isRealTime;

    final Widget content = isRealTime
        ? StreamBuilder<List<Translation>>(
            key: const ValueKey('stream_mode'),
            stream: FirestoreService().getTranslations(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (!snapshot.hasData) {
                return const Center(child: Text("데이터 없음"));
              }
              return _buildList(snapshot.data!, selectedLanguage, screenWidth, languageProvider);
            },
          )
        : FutureBuilder<List<Translation>>(
            key: const ValueKey('future_mode'),
            future: _cachedFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (!snapshot.hasData) {
                return const Center(child: Text("데이터 없음"));
              }
              return _buildList(snapshot.data!, selectedLanguage, screenWidth, languageProvider);
            },
          );

    return Scaffold(
      appBar: AppBar(
        title: const Text("청력 검사"),
        automaticallyImplyLeading: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        actions: [
          IconButton(
            icon: Icon(isRealTime ? Icons.cloud : Icons.cloud_off),
            onPressed: () => realTimeProvider.toggle(),
          ),
        ],
      ),
      body: content,
    );
  }

  Widget _buildList(
    List<Translation> translations,
    String selectedLanguage,
    double screenWidth,
    LanguageProvider languageProvider,
  ) {
    String getText(String key) {
      final t = translations.firstWhere(
        (t) => t.id == key,
        orElse: () => Translation(id: key, values: {}),
      );
      return t.getText(selectedLanguage);
    }

    // 카드 목록 정의
    final items = [
      {
        "title": getText("hearingSelect_002"),
        "subtitle": getText("hearingSelect_003"),
        "action": () {}, // 첫 번째 박스는 이동 없음
      },
      {
        "title": getText("hearingSelect_004"),
        "subtitle": getText("hearingSelect_007"),
        "action": () {
          // 두 번째 박스 클릭 시 UserInfoScreen으로 이동
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const UserInfoScreen()),
          );
        },
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
              final VoidCallback action = item['action'] as VoidCallback? ?? () {};
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: SizedBox(
                  height: 120,
                  child: ListTile(
                    title: Text(
                      item["title"] as String,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF4A148C),
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
            onChanged: (value) => languageProvider.setLanguage(value!),
            width: screenWidth / 4,
          ),
        ),
      ],
    );
  }
}
