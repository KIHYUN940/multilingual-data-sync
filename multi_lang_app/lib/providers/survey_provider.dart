import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/survey_question.dart';
import '../models/user_info.dart';
import '../services/firestore_service.dart';

class SurveyProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  List<SurveyQuestion> _questions = [];
  Map<String, dynamic> _answers = {};
  UserInfo? _userInfo;

  List<SurveyQuestion> get questions => _questions;
  Map<String, dynamic> get answers => _answers;
  UserInfo? get userInfo => _userInfo;

  Future<void> loadSurveyQuestions() async {
    final prefs = await SharedPreferences.getInstance();
    final cachedData = prefs.getString('survey_cache');

    if (cachedData != null) {
      _questions = SurveyQuestion.decodeList(cachedData);
      notifyListeners();
    }

    try {
      final translations = await _firestoreService.getTranslationsOnce();
      final surveyTranslations =
          translations.where((t) => t.id.startsWith('survey_')).toList();

      _questions =
          surveyTranslations.map((t) => SurveyQuestion.fromTranslation(t)).toList();

      await prefs.setString(
          'survey_cache', SurveyQuestion.encodeList(_questions));
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load survey questions: $e');
    }
  }

  String getQuestionText(SurveyQuestion q, String lang) {
    return q.getText(lang).trim();
  }

  List<String> getQuestionOptions(SurveyQuestion q, String lang) {
    return q.getOptions(lang);
  }

  void resetAnswers() {
    _answers = {};
    notifyListeners();
  }

  void setAnswer(String questionId, dynamic value, {bool notify = true}) {
    _answers[questionId] = value;
    if (notify) notifyListeners();
  }

  void setUserInfo(UserInfo? info) {
    _userInfo = info;
    notifyListeners();
  }

  Future<void> submitResponses() async {
    if (_userInfo == null) return;

    try {
      final savedId =
          await _firestoreService.saveUserResponse(_userInfo!, _answers);
      _userInfo = _userInfo!.copyWith(id: savedId);

      // 제출 후 답변 초기화
      resetAnswers();
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to submit responses: $e');
    }
  }
}
