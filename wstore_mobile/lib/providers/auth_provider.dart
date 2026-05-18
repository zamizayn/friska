import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  bool get isAuthenticated => StorageService.adminToken.isNotEmpty;
  String get role => StorageService.adminRole;
  String get branchName => StorageService.branchName;
  String get tenantName => StorageService.tenantName;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void _setError(String val) {
    _errorMessage = val;
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _setLoading(true);
    _setError("");
    try {
      final response = await ApiClient.post(
        ApiConfig.login,
        body: {'username': username, 'password': password},
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await StorageService.setAdminToken(data['token'] ?? '');
        await StorageService.setAdminRole(data['role'] ?? '');
        await StorageService.setBranchId(data['branchId']?.toString() ?? '');
        await StorageService.setBranchName(data['branchName'] ?? '');
        await StorageService.setSelectedBranchId(data['branchId']?.toString() ?? '');
        await StorageService.setTenantName(data['tenantName'] ?? '');
        await StorageService.setTenantId(data['tenantId']?.toString() ?? '');

        await registerFcm();
        
        _setLoading(false);
        return true;
      } else {
        _setError(data['error'] ?? 'Login failed with code ${response.statusCode}');
      }
    } catch (e) {
      _setError('Failed to connect to the backend server. Please verify address.');
    }
    _setLoading(false);
    return false;
  }

  Future<void> registerFcm() async {
    final fcmToken = StorageService.fcmToken;
    if (fcmToken.isEmpty) return;
    try {
      await ApiClient.post(
        ApiConfig.fcmRegister,
        body: {'token': fcmToken},
      );
    } catch (_) {}
  }

  Future<void> unregisterFcm() async {
    final fcmToken = StorageService.fcmToken;
    if (fcmToken.isEmpty) return;
    try {
      await ApiClient.post(
        ApiConfig.fcmUnregister,
        body: {'token': fcmToken},
      );
    } catch (_) {}
  }

  Future<bool> changePassword(String currentPassword, String newPassword) async {
    _setLoading(true);
    _setError("");
    try {
      final response = await ApiClient.post(
        ApiConfig.changePassword,
        body: {'currentPassword': currentPassword, 'newPassword': newPassword},
      );
      if (response.statusCode == 200) {
        _setLoading(false);
        return true;
      } else {
        final data = jsonDecode(response.body);
        _setError(data['error'] ?? 'Failed to change password');
      }
    } catch (e) {
      _setError('Failed to connect to the server');
    }
    _setLoading(false);
    return false;
  }

  Future<void> logout() async {
    _setLoading(true);
    await unregisterFcm();
    await StorageService.logout();
    _setLoading(false);
  }
}
