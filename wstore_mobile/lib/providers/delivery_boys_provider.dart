import 'dart:convert';
import 'dart:developer';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class DeliveryBoysProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";
  List<dynamic> _deliveryBoys = [];
  List<dynamic> _availableOrders = [];

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get deliveryBoys => _deliveryBoys;
  List<dynamic> get availableOrders => _availableOrders;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchDeliveryBoys() async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    try {
      final response =
          await ApiClient.get('${ApiConfig.deliveryBoys}?branchId=$branchId');
      log("delivery boys response: ${response.body}");
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) {
          _deliveryBoys = decoded;
        } else if (decoded is Map && decoded['data'] != null) {
          _deliveryBoys = decoded['data'];
        } else if (decoded is Map) {
          _deliveryBoys = decoded['deliveryBoys'] ??
              decoded['delivery_boys'] ??
              decoded.values.firstWhere((v) => v is List, orElse: () => []);
        } else {
          _deliveryBoys = [];
        }
      } else {
        _errorMessage = "Failed to load delivery boys";
      }
    } catch (e) {
      _errorMessage = "Network connection failed: $e";
    }
    _setLoading(false);
  }

  Future<bool> createDeliveryBoy({
    required String name,
    required String phone,
    required String password,
  }) async {
    _setLoading(true);
    final branchId = StorageService.selectedBranchId;
    try {
      final response = await ApiClient.post(ApiConfig.deliveryBoys, body: {
        'name': name,
        'phone': phone,
        'password': password,
        'branchId': branchId,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchDeliveryBoys();
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> updateDeliveryBoy(int id,
      {String? name, String? phone, String? status}) async {
    _setLoading(true);
    try {
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (phone != null) body['phone'] = phone;
      if (status != null) body['status'] = status;
      final response =
          await ApiClient.put('${ApiConfig.deliveryBoys}/$id', body: body);
      if (response.statusCode == 200) {
        await fetchDeliveryBoys();
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> deleteDeliveryBoy(int id) async {
    _setLoading(true);
    try {
      final response = await ApiClient.delete('${ApiConfig.deliveryBoys}/$id');
      if (response.statusCode == 200) {
        await fetchDeliveryBoys();
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<void> fetchAvailableOrders() async {
    try {
      final response = await ApiClient.get(ApiConfig.availableOrders);
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) {
          _availableOrders = decoded;
        } else if (decoded is Map && decoded['data'] != null) {
          _availableOrders = decoded['data'];
        } else if (decoded is Map) {
          _availableOrders = decoded['orders'] ??
              decoded.values.firstWhere((v) => v is List, orElse: () => []);
        } else {
          _availableOrders = [];
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> assignDeliveryBoy(int orderId, int deliveryBoyId) async {
    try {
      final response = await ApiClient.put(
        ApiConfig.orderAssignDelivery(orderId),
        body: {'deliveryBoyId': deliveryBoyId},
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
