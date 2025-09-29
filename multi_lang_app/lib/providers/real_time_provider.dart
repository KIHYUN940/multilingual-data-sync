import 'package:flutter/foundation.dart';

class RealTimeProvider extends ChangeNotifier {
  bool _isRealTime = false; // 초기값 false

  bool get isRealTime => _isRealTime;

  void setRealTime(bool value) {
    if (_isRealTime != value) {
      _isRealTime = value;
      notifyListeners();
    }
  }

  void toggle() {
    _isRealTime = !_isRealTime;
    notifyListeners();
  }
}
