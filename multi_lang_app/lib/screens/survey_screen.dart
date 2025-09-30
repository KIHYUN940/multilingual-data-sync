import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/survey_question.dart';
import '../providers/survey_provider.dart';
import '../providers/language_provider.dart';
import 'hearing_total_page_a1.dart';

class SurveyScreen extends StatefulWidget {
  const SurveyScreen({super.key});

  @override
  _SurveyScreenState createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSurveyQuestions();
  }

  Future<void> _loadSurveyQuestions() async {
    final surveyProvider = Provider.of<SurveyProvider>(context, listen: false);
    await surveyProvider.loadSurveyQuestions();
    setState(() => _loading = false);
  }

  void _submitSurvey() async {
    final surveyProvider = Provider.of<SurveyProvider>(context, listen: false);
    if (surveyProvider.userInfo == null) return;

    await surveyProvider.submitResponses();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('설문 응답이 저장되었습니다!')),
      );
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const HearingTotalPageA1()),
        (route) => false,
      );
    }
  }

  Widget _buildQuestionWidget(SurveyQuestion q, String lang) {
    final surveyProvider = Provider.of<SurveyProvider>(context, listen: false);
    final questionText = q.getText(lang).trim();
    final options = q.getOptions(lang);

    if (questionText.isEmpty) return const SizedBox.shrink();

    switch (q.type) {
      case 'multiple':
      case 'yesno':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(questionText, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            ...options.map((opt) {
              return RadioListTile<String>(
                title: Text(opt),
                value: opt,
                groupValue: surveyProvider.answers[q.key],
                onChanged: (val) => surveyProvider.setAnswer(q.key, val),
              );
            }).toList(),
          ],
        );
      case 'text':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(questionText, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            TextFormField(
              onChanged: (val) => surveyProvider.setAnswer(q.key, val),
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                hintText: "message", // 추후 번역 가능
              ),
            ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final surveyProvider = Provider.of<SurveyProvider>(context);
    final lang = Provider.of<LanguageProvider>(context).selectedLanguage;
    final questions = surveyProvider.questions;

    return Scaffold(
      appBar: AppBar(title: const Text('청력 건강 설문')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: ListView.separated(
                itemCount: questions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 24),
                itemBuilder: (_, index) => _buildQuestionWidget(questions[index], lang),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _submitSurvey,
        label: const Text('제출'),
        icon: const Icon(Icons.send),
      ),
    );
  }
}
