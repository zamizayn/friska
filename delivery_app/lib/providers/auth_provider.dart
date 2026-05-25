import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _loading = false;
  bool _authenticated = false;
  String? _error;

  bool get loading => _loading;
  bool get authenticated => _authenticated;
  String? get error => _error;

  Future<void> checkAuth() async {
    await StorageService.init();
    _authenticated = StorageService.deliveryToken.isNotEmpty;
    notifyListeners();
  }

  Future<bool> login(String phone, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await http.post(
        Uri.parse(ApiConfig.login),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phone, 'password': password}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        await StorageService.setDeliveryToken(data['token']);
        await StorageService.setDeliveryName(
            data['deliveryBoy']['name'] ?? '');
        await StorageService.setDeliveryPhone(
            data['deliveryBoy']['phone'] ?? '');
        await StorageService.setDeliveryBranchId(
            (data['deliveryBoy']['branchId'] ?? '').toString());
        await StorageService.setDeliveryBranchName(
            data['deliveryBoy']['branchName'] ?? '');
        _authenticated = true;
        _loading = false;
        notifyListeners();
        return true;
      } else {
        final err = jsonDecode(res.body);
        _error = err['error'] ?? 'Invalid credentials';
        _loading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Connection error. Please try again.';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await StorageService.logout();
    _authenticated = false;
    notifyListeners();
  }
}
