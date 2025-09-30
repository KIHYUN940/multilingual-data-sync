import 'dart:convert';
import 'translation.dart';

class SurveyQuestion {
  final String key;
  final String type; // multiple, yesno, text
  final Map<String, String> texts; // {'Value_KO': '텍스트', 'Value_EN': 'Text', 'Value_MN': '...'}
  final Map<String, List<String>> options; // {'Value_KO': ['옵션1', '옵션2'], ...}

  SurveyQuestion({
    required this.key,
    required this.type,
    required this.texts,
    Map<String, List<String>>? options,
  }) : options = options ?? {'Value_KO': [], 'Value_EN': [], 'Value_MN': []};

  /// Firestore Translation에서 생성
  factory SurveyQuestion.fromTranslation(Translation t) {
    Map<String, String> texts = {
      'Value_KO': t.values['Text_KO'] ?? '',
      'Value_EN': t.values['Text_EN'] ?? '',
      'Value_MN': t.values['Text_MN'] ?? '',
    };
    Map<String, List<String>> options = {
      'Value_KO': (t.values['Options_KO'] ?? '')
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(),
      'Value_EN': (t.values['Options_EN'] ?? '')
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(),
      'Value_MN': (t.values['Options_MN'] ?? '')
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(),
    };
    return SurveyQuestion(
        key: t.id, type: t.values['Type'] ?? 'text', texts: texts, options: options);
  }

  /// JSON 직렬화
  Map<String, dynamic> toJson() => {
        'key': key,
        'type': type,
        'texts': texts,
        'options': options,
      };

  factory SurveyQuestion.fromJson(Map<String, dynamic> json) {
    Map<String, String> texts = Map<String, String>.from(json['texts'] ?? {});
    Map<String, List<String>> options = {};
    if (json['options'] != null) {
      json['options'].forEach((k, v) {
        options[k] = List<String>.from(v);
      });
    }
    return SurveyQuestion(
      key: json['key'] ?? '',
      type: json['type'] ?? 'text',
      texts: texts,
      options: options,
    );
  }

  static String encodeList(List<SurveyQuestion> questions) =>
      jsonEncode(questions.map((q) => q.toJson()).toList());

  static List<SurveyQuestion> decodeList(String encoded) {
    final List data = jsonDecode(encoded);
    return data.map((e) => SurveyQuestion.fromJson(e)).toList();
  }

  /// 현재 언어 텍스트 가져오기
  String getText(String selectedLanguage) => texts[selectedLanguage] ?? texts['Value_KO'] ?? '';

  /// 현재 언어 옵션 가져오기
  List<String> getOptions(String selectedLanguage) {
    if (type == 'yesno') {
      switch (selectedLanguage) {
        case 'Value_KO':
          return ['예', '아니오'];
        case 'Value_EN':
          return ['Yes', 'No'];
        case 'Value_MN':
          return ['Тийм', 'Үгүй'];
        default:
          return ['예', '아니오'];
      }
    }
    return options[selectedLanguage] ?? options['Value_KO'] ?? [];
  }
}
