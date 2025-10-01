import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../providers/survey_provider.dart';
import 'ear_test_page.dart';
import 'user_info_screen.dart';
import '../widgets/language_dropdown.dart';

class HearingTotalPageA1 extends StatelessWidget {
  const HearingTotalPageA1({super.key});

  String getText(String key, String selectedLanguage) {
    Map<String, Map<String, String>> translations = {
      "healthManagement_001": {
        "Value_KO": "청력건강관리 체크 설문을 시작합니다!",
        "Value_EN": "Start Hearing Survey!",
        "Value_MN": "Сонсголын асуумжийг эхлүүлэх!"
      },
      "healthManagement_002": {
        "Value_KO": "간단한 설문지를 통해 지금 내 청력 상태를 확인해 보세요!",
        "Value_EN": "Check your current hearing with a simple survey!",
        "Value_MN": "Энгийн асуумжаар сонсголын одоогийн байдлаа шалгаарай!"
      },
      "estimatedTime": {
        "Value_KO": "(예상 소요 시간 3분)",
        "Value_EN": "(Estimated time 3 min)",
        "Value_MN": "(хугацаа: 3 минут)"
      },
      "healthManagement_003": {
        "Value_KO": "설문 시작하기",
        "Value_EN": "Start Survey",
        "Value_MN": "Асуумжийг эхлүүлэх"
      },
    };
    return translations[key]?[selectedLanguage] ?? '';
  }

  void _goBackToEarTest(BuildContext context) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const EarTestPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final languageProvider = Provider.of<LanguageProvider>(context);
    final selectedLanguage = languageProvider.selectedLanguage;
    final surveyProvider = Provider.of<SurveyProvider>(context, listen: false);

    return WillPopScope(
      onWillPop: () async {
        _goBackToEarTest(context);
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text("청력건강관리 설문"),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => _goBackToEarTest(context),
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    const Icon(Icons.health_and_safety,
                        size: 80, color: Colors.blue),
                    const SizedBox(height: 20),
                    Text(
                      getText("healthManagement_001", selectedLanguage),
                      style: const TextStyle(
                          fontSize: 22, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      getText("healthManagement_002", selectedLanguage),
                      style: const TextStyle(fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      getText("estimatedTime", selectedLanguage),
                      style:
                          const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          surveyProvider.resetAnswers();
                          surveyProvider.setUserInfo(null);

                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const UserInfoScreen()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(
                          getText("healthManagement_003", selectedLanguage),
                          style: const TextStyle(fontSize: 18),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: LanguageDropdown(
                selectedLanguage: selectedLanguage,
                onChanged: (value) {
                  if (value != null) languageProvider.setLanguage(value);
                },
                width: screenWidth / 4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
