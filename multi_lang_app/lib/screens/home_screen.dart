import 'package:flutter/material.dart';
import '../services/firestore_service.dart';
import '../models/translation.dart';
import 'translation_management_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String selectedLanguage = 'Value_KO';

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      appBar: AppBar(
        title: const Text("메인 화면"),
        centerTitle: true,
      ),
      body: StreamBuilder<List<Translation>>(
        stream: FirestoreService().getTranslations(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final translations = snapshot.data!;

          String getText(String key) {
            try {
              return translations.firstWhere((t) => t.id == key).getText(selectedLanguage);
            } catch (e) {
              return '';
            }
          }

          return Column(
            children: [
              // 광고 배너
              SizedBox(
                height: screenHeight * 0.25,
                width: double.infinity,
                child: Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage("assets/banner.jpg"),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Container(
                      alignment: Alignment.center,
                      color: Colors.black.withOpacity(0.4),
                      child: Text(
                        getText("homeBannerTitle"),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: screenWidth * 0.045,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 청력검사 버튼
              SizedBox(
                height: screenHeight * 0.2,
                width: screenWidth * 0.85,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6.0),
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      backgroundColor: Colors.deepPurple,
                    ),
                    child: Text(
                      getText("homeHearTestTitle"),
                      style: TextStyle(
                        fontSize: screenWidth * 0.045,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),

              // 2x2 메뉴 버튼
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: GridView.count(
                    crossAxisCount: 2,
                    childAspectRatio: screenWidth / (screenHeight * 0.35),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildMenuButton(
                        icon: Icons.chat,
                        label: getText("homeHAChatbotTitle"),
                        onTap: () {},
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                      ),
                      _buildMenuButton(
                        icon: Icons.location_on,
                        label: getText("homeLocationTitle1"),
                        onTap: () {},
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                      ),
                      _buildMenuButton(
                        icon: Icons.article,
                        label: getText("homeHearingNewsTitle"),
                        onTap: () {},
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                      ),
                      _buildMenuButton(
                        icon: Icons.settings,
                        label: "번역 관리",
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const TranslationManagementScreen()),
                          );
                        },
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                      ),
                    ],
                  ),
                ),
              ),

              // 언어 선택 드롭다운 (맨 밑 중앙, 1/3 가로)
              Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Container(
                  width: screenWidth / 3,
                  height: 40,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    color: Colors.deepPurple.shade50,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.deepPurple, width: 1),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedLanguage,
                      items: const [
                        DropdownMenuItem(value: 'Value_KO', child: Text("한국어")),
                        DropdownMenuItem(value: 'Value_EN', child: Text("English")),
                        DropdownMenuItem(value: 'Value_MN', child: Text("Монгол")),
                      ],
                      onChanged: (value) {
                        setState(() {
                          selectedLanguage = value!;
                        });
                      },
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.deepPurple.shade700,
                      ),
                      iconEnabledColor: Colors.deepPurple,
                      isExpanded: true,
                      alignment: Alignment.center,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMenuButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    double iconSize = 40,
    double fontSize = 14,
  }) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.deepPurple,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onPressed: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: iconSize, color: Colors.white),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontSize: fontSize),
          ),
        ],
      ),
    );
  }
}
