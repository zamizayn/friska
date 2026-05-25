import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';

class OrderItem {
  final int id;
  final String? address;
  final String? formattedAddress;
  final double total;
  final String status;
  final String? customerName;
  final String? customerPhone;
  final List<dynamic> items;
  final double? distanceFromBranch;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
  final String? paymentMethod;
  final String? paymentStatus;
  final String? appliedOfferCode;
  final double? discountAmount;
  final String createdAt;

  OrderItem({
    required this.id,
    this.address,
    this.formattedAddress,
    required this.total,
    required this.status,
    this.customerName,
    this.customerPhone,
    this.items = const [],
    this.distanceFromBranch,
    this.deliveryLatitude,
    this.deliveryLongitude,
    this.paymentMethod,
    this.paymentStatus,
    this.appliedOfferCode,
    this.discountAmount,
    required this.createdAt,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? 0,
      address: json['address'],
      formattedAddress: json['formattedAddress'],
      total: (json['total'] ?? 0).toDouble(),
      status: json['status'] ?? 'pending',
      customerName: json['customer']?['name'],
      customerPhone: json['customer']?['phone'],
      items: json['items'] ?? [],
      distanceFromBranch: json['distanceFromBranch']?.toDouble(),
      deliveryLatitude: json['deliveryLatitude']?.toDouble(),
      deliveryLongitude: json['deliveryLongitude']?.toDouble(),
      paymentMethod: json['paymentMethod'],
      paymentStatus: json['paymentStatus'],
      appliedOfferCode: json['appliedOfferCode'],
      discountAmount: json['discountAmount']?.toDouble(),
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class OrdersProvider extends ChangeNotifier {
  List<OrderItem> _orders = [];
  bool _loading = false;
  String? _error;
  int _totalPages = 1;
  int _currentPage = 1;

  List<OrderItem> get orders => _orders;
  bool get loading => _loading;
  String? get error => _error;
  int get totalPages => _totalPages;

  Future<void> fetchOrders({int page = 1, String? status}) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      String url = '${ApiConfig.orders}?page=$page&limit=20';
      if (status != null) url += '&status=$status';

      final res = await ApiClient.get(url);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        _orders =
            (data['data'] as List).map((o) => OrderItem.fromJson(o)).toList();
        _totalPages = data['totalPages'] ?? 1;
        _currentPage = data['page'] ?? 1;
      } else {
        _error = 'Failed to load orders';
      }
    } catch (e) {
      _error = 'Connection error';
    }

    _loading = false;
    notifyListeners();
  }

  Future<bool> updateStatus(int orderId, String newStatus) async {
    try {
      final res = await ApiClient.put(
        ApiConfig.orderStatus(orderId),
        body: {'status': newStatus},
      );

      if (res.statusCode == 200) {
        await fetchOrders(page: _currentPage);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
