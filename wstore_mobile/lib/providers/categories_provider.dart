import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class CategoriesProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";
  List<dynamic> _categories = [];

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get categories => _categories;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchCategories() async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    try {
      final response = await ApiClient.get('${ApiConfig.categories}?branchId=$branchId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _categories = data['data'] ?? data ?? [];
      } else {
        _errorMessage = "Failed to load categories";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<bool> deleteCategory(int categoryId) async {
    _setLoading(true);
    try {
      final response = await ApiClient.delete('${ApiConfig.categories}/$categoryId');
      if (response.statusCode == 200) {
        await fetchCategories();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> saveCategory({
    int? id,
    required String name,
    required String priority,
    File? imageFile,
  }) async {
    _setLoading(true);
    final branchId = StorageService.selectedBranchId;
    final method = id != null ? 'PUT' : 'POST';
    final url = id != null ? '${ApiConfig.categories}/$id' : ApiConfig.categories;

    final fields = <String, String>{
      'name': name,
      'priority': priority,
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
        await fetchCategories();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
