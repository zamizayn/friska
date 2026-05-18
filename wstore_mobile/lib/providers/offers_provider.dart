import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class OffersProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";
  List<dynamic> _offers = [];

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  List<dynamic> get offers => _offers;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  Future<void> fetchOffers() async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    try {
      final response = await ApiClient.get('${ApiConfig.offers}?branchId=$branchId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _offers = data['data'] ?? data ?? [];
      } else {
        _errorMessage = "Failed to load promotional offers";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  Future<bool> deleteOffer(int offerId) async {
    _setLoading(true);
    try {
      final response = await ApiClient.delete('${ApiConfig.offers}/$offerId');
      if (response.statusCode == 200) {
        await fetchOffers();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }

  Future<bool> saveOffer({
    int? id,
    required String code,
    required String type,
    required double value,
    required String expiryDate,
    required bool active,
  }) async {
    _setLoading(true);
    final branchId = StorageService.selectedBranchId;
    final method = id != null ? 'PUT' : 'POST';
    final url = id != null ? '${ApiConfig.offers}/$id' : ApiConfig.offers;

    final body = <String, dynamic>{
      'code': code,
      'type': type,
      'value': value,
      'expiryDate': expiryDate,
      'active': active,
    };
    if (id == null && branchId.isNotEmpty) {
      body['branchId'] = branchId;
    }

    try {
      final response = await (method == 'PUT'
          ? ApiClient.put(url, body: body)
          : ApiClient.post(url, body: body));
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchOffers();
        _setLoading(false);
        return true;
      }
    } catch (_) {}
    _setLoading(false);
    return false;
  }
}
