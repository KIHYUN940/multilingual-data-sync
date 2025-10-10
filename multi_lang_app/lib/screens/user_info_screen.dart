import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/survey_provider.dart';
import '../providers/language_provider.dart';
import '../models/user_info.dart';
import 'hearing_total_page_a1.dart';

// 생년월일 자동 하이픈 Formatter
class DateInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    String digitsOnly = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digitsOnly.length > 8) digitsOnly = digitsOnly.substring(0, 8);

    StringBuffer buffer = StringBuffer();
    for (int i = 0; i < digitsOnly.length; i++) {
      buffer.write(digitsOnly[i]);
      if (i == 3 || i == 5) buffer.write('-');
    }

    String text = buffer.toString();
    if (text.endsWith('-')) text = text.substring(0, text.length - 1);

    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

// 핸드폰 자동 하이픈 Formatter
class PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    String digitsOnly = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digitsOnly.length > 11) digitsOnly = digitsOnly.substring(0, 11);

    StringBuffer buffer = StringBuffer();
    for (int i = 0; i < digitsOnly.length; i++) {
      buffer.write(digitsOnly[i]);
      if (i == 2 || i == 6) {
        if (i != digitsOnly.length - 1) buffer.write('-');
      }
    }

    String text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

class UserInfoScreen extends StatefulWidget {
  const UserInfoScreen({super.key});

  @override
  State<UserInfoScreen> createState() => _UserInfoScreenState();
}

class _UserInfoScreenState extends State<UserInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  String _gender = 'male';
  final TextEditingController _birthController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  DateTime? _selectedBirthDate;

  @override
  void dispose() {
    _nameController.dispose();
    _birthController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initialDate = _selectedBirthDate ?? DateTime(2000, 1, 1);
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: now,
    );

    if (pickedDate != null) {
      setState(() {
        _selectedBirthDate = pickedDate;
        _birthController.text =
            "${pickedDate.year}-${pickedDate.month.toString().padLeft(2, '0')}-${pickedDate.day.toString().padLeft(2, '0')}";
      });
    }
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

      // HearingTotalPageA1로 이동
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HearingTotalPageA1()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final selectedLanguage = languageProvider.selectedLanguage;

    Map<String, Map<String, String>> translations = {
      'name': {'Value_KO': '이름', 'Value_EN': 'Name', 'Value_MN': 'Нэр'},
      'gender': {'Value_KO': '성별', 'Value_EN': 'Gender', 'Value_MN': 'Хүйс'},
      'birth': {'Value_KO': '생년월일', 'Value_EN': 'Birth Date', 'Value_MN': 'Төрсөн огноо'},
      'phone': {'Value_KO': '핸드폰 번호', 'Value_EN': 'Phone', 'Value_MN': 'Утасны дугаар'},
      'submit': {'Value_KO': '다음', 'Value_EN': 'Next', 'Value_MN': 'Дараагийн'},
      'required': {'Value_KO': '입력하세요', 'Value_EN': 'Please enter', 'Value_MN': 'Оруулна уу'},
      'name_invalid': {
        'Value_KO': '이름에는 숫자나 특수문자를 포함할 수 없습니다',
        'Value_EN': 'Name cannot contain numbers or special characters',
        'Value_MN': 'Нэр нь тоо эсвэл тусгай тэмдэгт агуулж болохгүй'
      },
      'birth_invalid_format': {
        'Value_KO': 'YYYY-MM-DD 형식으로 입력해주세요',
        'Value_EN': 'Please enter in YYYY-MM-DD format',
        'Value_MN': 'YYYY-MM-DD форматтай оруулна уу'
      },
      'birth_future': {
        'Value_KO': '생년월일은 미래일 수 없습니다',
        'Value_EN': 'Birth date cannot be in the future',
        'Value_MN': 'Төрсөн огноо ирээдүйд байх боломжгүй'
      },
      'birth_invalid_date': {
        'Value_KO': '올바른 날짜를 입력해주세요',
        'Value_EN': 'Please enter a valid date',
        'Value_MN': 'Зөв огноо оруулна уу'
      },
      'phone_invalid': {
        'Value_KO': '올바른 핸드폰 번호를 입력해주세요 (예: 010-1234-5678)',
        'Value_EN': 'Please enter a valid phone number (e.g., 010-1234-5678)',
        'Value_MN': 'Зөв утасны дугаар оруулна уу (жишээ: 010-1234-5678)'
      },
      'male': {'Value_KO': '남성', 'Value_EN': 'Male', 'Value_MN': 'Эрэгтэй'},
      'female': {'Value_KO': '여성', 'Value_EN': 'Female', 'Value_MN': 'Эмэгтэй'},
      'other': {'Value_KO': '기타', 'Value_EN': 'Other', 'Value_MN': 'Бусад'},
    };

    String getText(String key) => translations[key]?[selectedLanguage] ?? '';

    return Scaffold(
      appBar: AppBar(title: Text('유저 정보 입력')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(labelText: getText('name')),
                      keyboardType: TextInputType.name,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return '${getText('name')} ${getText('required')}';
                        }
                        final regex = RegExp(r'^[a-zA-Z가-힣\s]+$');
                        if (!regex.hasMatch(value.trim())) return getText('name_invalid');
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
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
                    TextFormField(
                      controller: _birthController,
                      decoration: InputDecoration(
                        labelText: getText('birth'),
                        hintText: 'YYYY-MM-DD',
                        suffixIcon: IconButton(
                          icon: Icon(Icons.calendar_today),
                          onPressed: _pickBirthDate,
                        ),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [DateInputFormatter()],
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return '${getText('birth')} ${getText('required')}';
                        final regex = RegExp(r'^\d{4}-\d{2}-\d{2}$');
                        if (!regex.hasMatch(value.trim())) return getText('birth_invalid_format');
                        try {
                          final date = DateTime.parse(value.trim());
                          if (date.isAfter(DateTime.now())) return getText('birth_future');
                        } catch (_) {
                          return getText('birth_invalid_date');
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneController,
                      decoration: InputDecoration(labelText: getText('phone')),
                      keyboardType: TextInputType.number,
                      inputFormatters: [PhoneInputFormatter()],
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return '${getText('phone')} ${getText('required')}';
                        final regex = RegExp(r'^\d{3}-\d{3,4}-\d{4}$');
                        if (!regex.hasMatch(value.trim())) return getText('phone_invalid');
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),
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
