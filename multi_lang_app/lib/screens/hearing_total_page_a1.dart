import 'package:flutter/material.dart';
import '../widgets/language_dropdown.dart';

class HearingTotalPageA1 extends StatefulWidget {
  final String selectedLanguage;

  const HearingTotalPageA1({super.key, required this.selectedLanguage});

  @override
  State<HearingTotalPageA1> createState() => _HearingTotalPageA1State();
}

class _HearingTotalPageA1State extends State<HearingTotalPageA1> {
  late String selectedLanguage;

  @override
  void initState() {
    super.initState();
    selectedLanguage = widget.selectedLanguage;
  }

  // 여기서 나중에 Firestore 번역 데이터를 사용해 getText 함수로 언어별 텍스트 바꾸기 가능
  String getText(String key) {
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

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      appBar: AppBar(title: const Text("청력건강관리 설문")),
      body: Column(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 40),
                  const Icon(Icons.health_and_safety, size: 80, color: Colors.blue),
                  const SizedBox(height: 20),
                  Text(
                    getText("healthManagement_001"),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    getText("healthManagement_002"),
                    style: const TextStyle(fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    getText("estimatedTime"),
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        // TODO: 실제 설문 시작 페이지로 이동
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        getText("healthManagement_003"),
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
                setState(() {
                  selectedLanguage = value!;
                });
              },
              width: screenWidth / 4,
            ),
          ),
        ],
      ),
    );
  }
}
