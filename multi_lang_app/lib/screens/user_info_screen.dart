import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/survey_provider.dart';
import '../providers/language_provider.dart';
import '../models/user_info.dart';
import 'survey_screen.dart';

class UserInfoScreen extends StatefulWidget {
  const UserInfoScreen({super.key});

  @override
  State<UserInfoScreen> createState() => _UserInfoScreenState();
}

class _UserInfoScreenState extends State<UserInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  String _gender = 'male'; // 내부 값: male/female/other
  final TextEditingController _birthController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _birthController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final surveyProvider = Provider.of<SurveyProvider>(context, listen: false);
      surveyProvider.setUserInfo(
        UserInfo(
          name: _nameController.text.trim(),
          gender: _gender,
          birthDate: _birthController.text.trim(),
          phone: _phoneController.text.trim(),
        ),
      );

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const SurveyScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final selectedLanguage = languageProvider.selectedLanguage;

    // 번역 맵
    Map<String, Map<String, String>> translations = {
      'name': {'Value_KO': '이름', 'Value_EN': 'Name', 'Value_MN': 'Нэр'},
      'gender': {'Value_KO': '성별', 'Value_EN': 'Gender', 'Value_MN': 'Хүйс'},
      'birth': {
        'Value_KO': '생년월일 (YYYY-MM-DD)',
        'Value_EN': 'Birth Date (YYYY-MM-DD)',
        'Value_MN': 'Төрсөн огноо (YYYY-MM-DD)'
      },
      'phone': {'Value_KO': '핸드폰 번호', 'Value_EN': 'Phone', 'Value_MN': 'Утасны дугаар'},
      'submit': {'Value_KO': '설문 시작하기', 'Value_EN': 'Start Survey', 'Value_MN': 'Асуумжийг эхлүүлэх'},
      'required': {'Value_KO': '입력하세요', 'Value_EN': 'Please enter', 'Value_MN': 'Оруулна уу'},
      // 성별 선택지
      'male': {'Value_KO': '남성', 'Value_EN': 'Male', 'Value_MN': 'Эрэгтэй'},
      'female': {'Value_KO': '여성', 'Value_EN': 'Female', 'Value_MN': 'Эмэгтэй'},
      'other': {'Value_KO': '기타', 'Value_EN': 'Other', 'Value_MN': 'Бусад'},
    };

    String getText(String key) => translations[key]?[selectedLanguage] ?? '';

    return Scaffold(
      appBar: AppBar(title: Text(getText('name') + " " + getText('required'))),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    // 이름
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(labelText: getText('name')),
                      validator: (value) =>
                          value == null || value.isEmpty ? '${getText('name')} ${getText('required')}' : null,
                    ),
                    const SizedBox(height: 16),
                    // 성별
                    DropdownButtonFormField<String>(
                      value: _gender,
                      items: [
                        DropdownMenuItem(value: 'male', child: Text(getText('male'))),
                        DropdownMenuItem(value: 'female', child: Text(getText('female'))),
                        DropdownMenuItem(value: 'other', child: Text(getText('other'))),
                      ],
                      onChanged: (value) => setState(() => _gender = value!),
                      decoration: InputDecoration(labelText: getText('gender')),
                    ),
                    const SizedBox(height: 16),
                    // 생년월일
                    TextFormField(
                      controller: _birthController,
                      decoration: InputDecoration(labelText: getText('birth')),
                      validator: (value) =>
                          value == null || value.isEmpty ? '${getText('birth')} ${getText('required')}' : null,
                    ),
                    const SizedBox(height: 16),
                    // 전화번호
                    TextFormField(
                      controller: _phoneController,
                      decoration: InputDecoration(labelText: getText('phone')),
                      validator: (value) =>
                          value == null || value.isEmpty ? '${getText('phone')} ${getText('required')}' : null,
                    ),
                  ],
                ),
              ),
            ),
            // 제출 버튼
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submit,
                child: Text(getText('submit')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
