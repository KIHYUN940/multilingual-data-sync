// lib/widgets/language_dropdown.dart
import 'package:flutter/material.dart';
import 'package:dropdown_button2/dropdown_button2.dart';

class LanguageDropdown extends StatelessWidget {
  final String selectedLanguage;
  final ValueChanged<String?> onChanged;
  final double width;

  const LanguageDropdown({
    super.key,
    required this.selectedLanguage,
    required this.onChanged,
    this.width = 120,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonHideUnderline(
      child: DropdownButton2<String>(
        value: selectedLanguage,
        isExpanded: true,
        items: const [
          DropdownMenuItem(value: 'Value_KO', child: Center(child: Text("한국어"))),
          DropdownMenuItem(value: 'Value_EN', child: Center(child: Text("English"))),
          DropdownMenuItem(value: 'Value_MN', child: Center(child: Text("Монгол"))),
        ],
        onChanged: onChanged,
        buttonStyleData: ButtonStyleData(
          height: 40,
          width: width,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.deepPurple.shade50,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.deepPurple, width: 1),
          ),
        ),
        iconStyleData: const IconStyleData(
          icon: Icon(Icons.arrow_drop_down, color: Colors.deepPurple),
          iconSize: 24,
        ),
        dropdownStyleData: DropdownStyleData(
          maxHeight: 150,
          width: width,
          offset: const Offset(0, -5),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Colors.white,
          ),
        ),
        menuItemStyleData: const MenuItemStyleData(
          height: 40,
          padding: EdgeInsets.symmetric(horizontal: 8),
        ),
      ),
    );
  }
}
