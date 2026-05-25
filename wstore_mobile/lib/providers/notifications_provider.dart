import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';

class NotificationsProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<dynamic> _notifications = [];
  int _unreadCount = 0;

  bool get isLoading => _isLoading;
  List<dynamic> get notifications => _notifications;
  int get unreadCount => _unreadCount;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchNotifications() async {
    _setLoading(true);
    try {
      final response = await ApiClient.get(ApiConfig.notifications);
      if (response.statusCode == 200) {
        _notifications = jsonDecode(response.body) ?? [];
        _unreadCount = _notifications.where((n) => n['isRead'] == false).length;
      }
    } catch (_) {}
    _setLoading(false);
  }

  Future<void> markAllRead() async {
    try {
      await ApiClient.put(ApiConfig.notificationsRead);
      for (var n in _notifications) {
        n['isRead'] = true;
      }
      _unreadCount = 0;
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> registerFcmToken(String token) async {
    try {
      final response = await ApiClient.post(ApiConfig.fcmRegister, body: {'token': token});
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> unregisterFcmToken() async {
    try {
      final response = await ApiClient.delete(ApiConfig.fcmUnregister);
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
