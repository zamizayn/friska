import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class BranchesProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";
  List<dynamic> _branches = [];

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get branches => _branches;

  String get selectedBranchId => StorageService.selectedBranchId;
  String get selectedBranchName {
    final activeId = StorageService.selectedBranchId;
    final activeBranch = _branches.firstWhere(
      (b) => b['id']?.toString() == activeId,
      orElse: () => null,
    );
    return activeBranch != null ? activeBranch['name'] ?? 'Default' : StorageService.branchName;
  }

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchBranches() async {
    _setLoading(true);
    _errorMessage = "";
    final tenantId = StorageService.tenantId;
    final role = StorageService.adminRole;

    String url = ApiConfig.branches;
    if (role == 'tenant' && tenantId.isNotEmpty) {
      url += '?tenantId=$tenantId';
    }

    try {
      final response = await ApiClient.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _branches = data['data'] ?? data ?? [];
        
        if (StorageService.selectedBranchId.isEmpty && _branches.isNotEmpty) {
          final firstId = _branches[0]['id']?.toString() ?? '';
          final firstName = _branches[0]['name'] ?? '';
          await StorageService.setSelectedBranchId(firstId);
          await StorageService.setBranchName(firstName);
        }
      } else {
        _errorMessage = "Failed to load branches list";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<void> selectBranch(String branchId, String branchName) async {
    await StorageService.setSelectedBranchId(branchId);
    await StorageService.setBranchName(branchName);
    notifyListeners();
  }

  Future<bool> createBranch(Map<String, dynamic> data) async {
    _setLoading(true);
    final tenantId = StorageService.tenantId;
    try {
      data['tenantId'] = tenantId;
      final response = await ApiClient.post(ApiConfig.branches, body: data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchBranches();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> updateBranch(int id, Map<String, dynamic> data) async {
    _setLoading(true);
    try {
      final response = await ApiClient.put('${ApiConfig.branches}/$id', body: data);
      if (response.statusCode == 200) {
        await fetchBranches();
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> deleteBranch(int id) async {
    _setLoading(true);
    try {
      final response = await ApiClient.delete('${ApiConfig.branches}/$id');
      if (response.statusCode == 200) {
        await fetchBranches();
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
