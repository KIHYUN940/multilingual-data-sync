class UserInfo {
  final String id;       // Firestore doc id
  final String name;
  final String gender;
  final String birthDate; // YYYY-MM-DD 형식
  final String phone;

  UserInfo({
    this.id = '',
    required this.name,
    required this.gender,
    required this.birthDate,
    required this.phone,
  });

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'gender': gender,
      'birthDate': birthDate,
      'phone': phone,
    };
  }

  UserInfo copyWith({
    String? id,
    String? name,
    String? gender,
    String? birthDate,
    String? phone,
  }) {
    return UserInfo(
      id: id ?? this.id,
      name: name ?? this.name,
      gender: gender ?? this.gender,
      birthDate: birthDate ?? this.birthDate,
      phone: phone ?? this.phone,
    );
  }
}
