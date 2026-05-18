import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class CustomersProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";
  List<dynamic> _customers = [];

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get customers => _customers;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchCustomers({String search = ""}) async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    String url = '${ApiConfig.customers}?branchId=$branchId';
    if (search.isNotEmpty) {
      url += '&search=$search';
    }

    try {
      final response = await ApiClient.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _customers = data['data'] ?? data ?? [];
      } else {
        _errorMessage = "Failed to load customers list";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<bool> deleteCustomer(int customerId) async {
    _setLoading(true);
    try {
      final response = await ApiClient.delete('${ApiConfig.customers}/$customerId');
      if (response.statusCode == 200) {
        await fetchCustomers();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> sendBroadcast({
    required String message,
    required List<String> targetPhoneNumbers,
  }) async {
    _setLoading(true);
    try {
      final response = await ApiClient.post(
        ApiConfig.broadcast,
        body: {
          'message': message,
          'phoneNumbers': targetPhoneNumbers,
        },
      );
      if (response.statusCode == 200) {
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
