import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart'; 
import 'firebase_options.dart';
import 'screens/home_page.dart';
import 'providers/language_provider.dart';
import 'providers/real_time_provider.dart'; // 나중에 실시간 on/off용

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
        ChangeNotifierProvider(create: (_) => RealTimeProvider()), // 실시간 on/off용
      ],
      child: const MyAppWrapper(),
    ),
  );
}

// const MyAppWrapper()를 두는 이유: main에서 MultiProvider 바로 wrap
class MyAppWrapper extends StatelessWidget {
  const MyAppWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return const MyApp();
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Provider 구독 (필요 시 선택한 언어 가져오기)
    final languageProvider = Provider.of<LanguageProvider>(context);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Firebase Translator',
      theme: ThemeData(
        primarySwatch: Colors.deepPurple,
      ),
      home: HomePage(),
    );
  }
}
