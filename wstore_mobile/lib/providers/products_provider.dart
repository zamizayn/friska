import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class ProductsProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";

  List<dynamic> _products = [];
  Map<String, dynamic> _pagination = {'page': 1, 'totalPages': 1, 'total': 0};

  List<dynamic> _suggestions = [];
  Map<String, dynamic>? _metaStatus;
  bool _metaLoading = false;

  String _search = "";
  String _categoryId = "";
  String _stockStatus = "";
  String _sortBy = "newest";
  String _sortOrder = "DESC";

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get products => _products;
  Map<String, dynamic> get pagination => _pagination;
  List<dynamic> get suggestions => _suggestions;
  Map<String, dynamic>? get metaStatus => _metaStatus;
  bool get metaLoading => _metaLoading;

  String get search => _search;
  String get categoryId => _categoryId;
  String get stockStatus => _stockStatus;
  String get sortBy => _sortBy;
  String get sortOrder => _sortOrder;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void setFilters({String? search, String? categoryId, String? stockStatus, String? sortBy, String? sortOrder}) {
    if (search != null) _search = search;
    if (categoryId != null) _categoryId = categoryId;
    if (stockStatus != null) _stockStatus = stockStatus;
    if (sortBy != null) _sortBy = sortBy;
    if (sortOrder != null) _sortOrder = sortOrder;
    notifyListeners();
  }

  void clearFilters() {
    _search = "";
    _categoryId = "";
    _stockStatus = "";
    _sortBy = "newest";
    _sortOrder = "DESC";
    notifyListeners();
  }

  Future<void> fetchProducts({int page = 1}) async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    final tenantId = StorageService.tenantId;
    final role = StorageService.adminRole;

    String url = '${ApiConfig.products}?page=$page&limit=10&branchId=$branchId';
    if (role == 'superadmin' && tenantId.isNotEmpty) {
      url += '&tenantId=$tenantId';
    }
    if (_search.isNotEmpty) url += '&search=$_search';
    if (_categoryId.isNotEmpty) url += '&categoryId=$_categoryId';
    if (_stockStatus.isNotEmpty) url += '&stockStatus=$_stockStatus';
    if (_sortBy.isNotEmpty) url += '&sortBy=$_sortBy&sortOrder=$_sortOrder';

    try {
      final response = await ApiClient.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _products = data['data'] ?? [];
        _pagination = {
          'page': data['page'] ?? 1,
          'totalPages': data['totalPages'] ?? 1,
          'total': data['total'] ?? 0,
        };
      } else {
        _errorMessage = "Failed to load products";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<void> fetchSuggestions(String query) async {
    if (query.length < 2) {
      _suggestions = [];
      notifyListeners();
      return;
    }
    final branchId = StorageService.selectedBranchId;
    final tenantId = StorageService.tenantId;
    final role = StorageService.adminRole;

    String url = '${ApiConfig.productsBasic}?search=$query&branchId=$branchId';
    if (role == 'superadmin' && tenantId.isNotEmpty) {
      url += '&tenantId=$tenantId';
    }

    try {
      final response = await ApiClient.get(url);
      if (response.statusCode == 200) {
        _suggestions = jsonDecode(response.body) ?? [];
      }
    } catch (_) {}
    notifyListeners();
  }

  Future<void> fetchMetaStatus(int productId) async {
    _metaLoading = true;
    _metaStatus = null;
    notifyListeners();
    try {
      final response = await ApiClient.get('${ApiConfig.products}/$productId/meta-status');
      if (response.statusCode == 200) {
        _metaStatus = jsonDecode(response.body);
      }
    } catch (_) {}
    _metaLoading = false;
    notifyListeners();
  }

  Future<bool> deleteProduct(int productId) async {
    _setLoading(true);
    try {
      final response = await ApiClient.delete('${ApiConfig.products}/$productId');
      if (response.statusCode == 200) {
        await fetchProducts(page: _pagination['page'] ?? 1);
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> saveProduct({
    int? id,
    required String name,
    required String price,
    required String categoryId,
    required String description,
    required String stock,
    String? retailerId,
    String? priority,
    File? imageFile,
  }) async {
    _setLoading(true);
    final branchId = StorageService.selectedBranchId;
    final method = id != null ? 'PUT' : 'POST';
    final url = id != null ? '${ApiConfig.products}/$id' : ApiConfig.products;

    final fields = <String, String>{
      'name': name,
      'price': price,
      'categoryId': categoryId,
      'description': description,
      'stock': stock,
      'retailerId': retailerId ?? '',
      'priority': priority ?? '',
    };
    if (id == null && branchId.isNotEmpty) {
      fields['branchId'] = branchId;
    }

    try {
      final response = await ApiClient.uploadFile(
        url,
        method: method,
        fields: fields,
        fileFieldName: 'image',
        file: imageFile,
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchProducts(page: _pagination['page'] ?? 1);
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
