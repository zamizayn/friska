import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class OrdersProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";

  List<dynamic> _orders = [];
  Map<String, dynamic> _pagination = {'page': 1, 'totalPages': 1, 'total': 0};

  String _search = "";
  String _status = "";
  String _startDate = "";
  String _endDate = "";

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get orders => _orders;
  Map<String, dynamic> get pagination => _pagination;

  String get search => _search;
  String get status => _status;
  String get startDate => _startDate;
  String get endDate => _endDate;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void setFilters(
      {String? search, String? status, String? startDate, String? endDate}) {
    if (search != null) _search = search;
    if (status != null) _status = status;
    if (startDate != null) _startDate = startDate;
    if (endDate != null) _endDate = endDate;
    notifyListeners();
  }

  void clearFilters() {
    _search = "";
    _status = "";
    _startDate = "";
    _endDate = "";
    notifyListeners();
  }

  Future<void> fetchOrders({int page = 1}) async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    final tenantId = StorageService.tenantId;
    final role = StorageService.adminRole;

    String url = '${ApiConfig.orders}?page=$page&limit=10&branchId=$branchId';
    if (role == 'superadmin') {
      url += '&tenantId=$tenantId';
    }
    if (_search.isNotEmpty) url += '&search=$_search';
    if (_status.isNotEmpty) url += '&status=$_status';
    if (_startDate.isNotEmpty) url += '&startDate=$_startDate';
    if (_endDate.isNotEmpty) url += '&endDate=$_endDate';

    try {
      final response = await ApiClient.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _orders = data['data'] ?? [];
        _pagination = {
          'page': data['page'] ?? 1,
          'totalPages': data['totalPages'] ?? 1,
          'total': data['total'] ?? 0,
        };
      } else {
        _errorMessage = "Failed to load orders";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<bool> updateOrderStatus(int orderId, String newStatus,
      {String? cancellationReason}) async {
    _setLoading(true);
    try {
      final body = <String, dynamic>{'status': newStatus};
      if (cancellationReason != null) {
        body['cancellationReason'] = cancellationReason;
      }
      final response = await ApiClient.put(
        '${ApiConfig.orders}/$orderId/status',
        body: body,
      );

      print(response.body);
      if (response.statusCode == 200) {
        await fetchOrders(page: _pagination['page'] ?? 1);
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> updatePaymentStatus(int orderId, String newPaymentStatus) async {
    _setLoading(true);
    try {
      final response = await ApiClient.put(
        '${ApiConfig.orders}/$orderId/payment-status',
        body: {'paymentStatus': newPaymentStatus},
      );
      if (response.statusCode == 200) {
        await fetchOrders(page: _pagination['page'] ?? 1);
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> createManualOrder({
    required String customerName,
    required String customerPhone,
    required String address,
    required String paymentMethod,
    required List<Map<String, dynamic>> items,
  }) async {
    _setLoading(true);
    final branchId = StorageService.selectedBranchId;
    final total = items.fold<double>(0.0, (sum, item) {
      final price = double.tryParse(item['price'].toString()) ?? 0.0;
      final quantity = int.tryParse(item['quantity'].toString()) ?? 1;
      return sum + (price * quantity);
    });

    try {
      final response = await ApiClient.post(
        ApiConfig.orders,
        body: {
          'customerName': customerName,
          'customerPhone': customerPhone,
          'address': address,
          'paymentMethod': paymentMethod,
          'items': items,
          'total': total,
          'status': 'pending',
          'branchId': branchId,
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchOrders();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
