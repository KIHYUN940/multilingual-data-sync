import 'package:flutter/material.dart';
import '../models/translation.dart';

class TranslationItem extends StatelessWidget {
  final Translation translation;
  final String lang;

  const TranslationItem({super.key, required this.translation, required this.lang});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(translation.getText(lang)),
    );
  }
}
