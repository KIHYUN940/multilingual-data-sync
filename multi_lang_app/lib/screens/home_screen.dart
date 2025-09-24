import 'dart:async';
import 'package:flutter/material.dart';
import '../services/firestore_service.dart';
import '../models/translation.dart';
import 'translation_management_screen.dart';
import '../widgets/language_dropdown.dart'; 

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  String selectedLanguage = 'Value_KO';
  int _currentPage = 0;
  Timer? _timer;

  // 배너 애니메이션 컨트롤러
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(1, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animationController, curve: Curves.easeInOut));

    _animationController.forward();

    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      _nextPage();
    });
  }

  void _nextPage() {
    setState(() {
      _currentPage = (_currentPage + 1) % 2;
      _animationController.reset();
      _slideAnimation = Tween<Offset>(
        begin: const Offset(1, 0),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: _animationController, curve: Curves.easeInOut));
      _animationController.forward();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: null,
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
              // 배너 영역
              SizedBox(
                height: screenHeight * 0.32,
                child: Stack(
                  children: [
                    if (_currentPage == 0)
                      SlideTransition(
                        position: _slideAnimation,
                        child: _buildBannerPage(
                          screenWidth,
                          '다국어 번역 동기화 프로젝트',
                          'Firebase와 연결된 실시간 번역 관리',
                          backgroundColor: Colors.deepPurple.shade50,
                          titleColor: Colors.deepPurple.shade700,
                          subtitleColor: Colors.deepPurple.shade400,
                        ),
                      ),
                    if (_currentPage == 1)
                      SlideTransition(
                        position: _slideAnimation,
                        child: _buildBannerPage(
                          screenWidth,
                          'Multilingual Translation Sync Project',
                          'Real-time translation management connected with Firebase',
                          backgroundColor: Colors.deepPurple.shade700,
                          titleColor: Colors.deepPurple.shade50,
                          subtitleColor: Colors.deepPurple.shade100,
                        ),
                      ),
                    // 페이지 인디케이터
                    Positioned(
                      bottom: 8,
                      right: 16,
                      child: Row(
                        children: List.generate(2, (index) {
                          return GestureDetector(
                            onTap: () {
                              if (_currentPage != index) {
                                setState(() {
                                  _currentPage = index;
                                  _animationController.reset();
                                  _slideAnimation = Tween<Offset>(
                                    begin: const Offset(1, 0),
                                    end: Offset.zero,
                                  ).animate(CurvedAnimation(parent: _animationController, curve: Curves.easeInOut));
                                  _animationController.forward();
                                });
                              }
                            },
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: _currentPage == index ? 12 : 8,
                              height: _currentPage == index ? 12 : 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _currentPage == index ? Colors.deepPurple : Colors.deepPurple.shade200,
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                  ],
                ),
              ),

              // 청력검사 버튼
              SizedBox(
                height: screenHeight * 0.17,
                width: screenWidth * 0.85,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6.0),
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      backgroundColor: Colors.deepPurple.shade300,
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
                        color: Colors.deepPurple.shade300,
                      ),
                      _buildMenuButton(
                        icon: Icons.location_on,
                        label: getText("homeLocationTitle1"),
                        onTap: () {},
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                        color: Colors.deepPurple.shade300,
                      ),
                      _buildMenuButton(
                        icon: Icons.article,
                        label: getText("homeHearingNewsTitle"),
                        onTap: () {},
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                        color: Colors.deepPurple.shade300,
                      ),
                      _buildMenuButton(
                        icon: Icons.settings,
                        label: getText("TranslationManagement"),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const TranslationManagementScreen()),
                          );
                        },
                        iconSize: screenWidth * 0.08,
                        fontSize: screenWidth * 0.035,
                        color: Colors.deepPurple.shade300,
                      ),
                    ],
                  ),
                ),
              ),

              // 커스텀 드롭다운 적용
              Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
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
          );
        },
      ),
    );
  }

  Widget _buildBannerPage(
    double screenWidth,
    String title,
    String subtitle, {
    required Color backgroundColor,
    required Color titleColor,
    required Color subtitleColor,
  }) {
    return Container(
      width: double.infinity,
      color: backgroundColor,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.translate,
              size: screenWidth * 0.18,
              color: titleColor,
            ),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: screenWidth * 0.05,
                fontWeight: FontWeight.bold,
                color: titleColor,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: screenWidth * 0.03,
                color: subtitleColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    double iconSize = 40,
    double fontSize = 14,
    Color color = Colors.deepPurple,
  }) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
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
