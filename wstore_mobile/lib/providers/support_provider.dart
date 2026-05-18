import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class SupportProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";
  List<dynamic> _tickets = [];

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get tickets => _tickets;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchTickets() async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    try {
      final response = await ApiClient.get('${ApiConfig.supportRequests}?branchId=$branchId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _tickets = data['data'] ?? data ?? [];
      } else {
        _errorMessage = "Failed to load support tickets";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<bool> resolveTicket(int ticketId) async {
    _setLoading(true);
    try {
      final response = await ApiClient.put(
        '${ApiConfig.supportRequests}/$ticketId',
        body: {'status': 'resolved'},
      );
      if (response.statusCode == 200) {
        await fetchTickets();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> replyToTicket(int ticketId, String message) async {
    _setLoading(true);
    try {
      final response = await ApiClient.post(
        '${ApiConfig.supportRequests}/$ticketId/replies',
        body: {'message': message},
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchTickets();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
