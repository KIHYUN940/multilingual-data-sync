class Translation {
  final String id;
  final Map<String, String> values;

  Translation({required this.id, required this.values});

  Map<String, dynamic> toMap() => values;

  factory Translation.fromMap(String id, Map<String, dynamic> map) {
    return Translation(
      id: id,
      values: map.map((key, value) => MapEntry(key, value.toString())),
    );
  }

  String getText(String lang) => values[lang] ?? '';
}
