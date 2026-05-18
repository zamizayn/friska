import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class DashboardProvider extends ChangeNotifier {
  bool _isLoading = false;
  String _errorMessage = "";

  Map<String, dynamic> _kpis = {};
  List<dynamic> _activityFeed = [];
  List<dynamic> _lowStockAlerts = [];
  List<dynamic> _notifications = [];
  List<dynamic> _revenueTrend = [];
  List<dynamic> _categoryShare = [];

  String _dateRange = "today"; 

  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  String get dateRange => _dateRange;

  Map<String, dynamic> get kpis => _kpis;
  List<dynamic> get activityFeed => _activityFeed;
  List<dynamic> get lowStockAlerts => _lowStockAlerts;
  List<dynamic> get notifications => _notifications;
  List<dynamic> get revenueTrend => _revenueTrend;
  List<dynamic> get categoryShare => _categoryShare;

  int get unreadNotificationsCount => _notifications.where((n) => n['isRead'] == false).length;

  Timer? _pollingTimer;

  DashboardProvider() {
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (StorageService.adminToken.isNotEmpty) {
        fetchLiveUpdates();
      }
    });
  }

  DateTime? _customStartDate;
  DateTime? _customEndDate;

  DateTime? get customStartDate => _customStartDate;
  DateTime? get customEndDate => _customEndDate;

  void setDateRange(String range) {
    _dateRange = range;
    _customStartDate = null;
    _customEndDate = null;
    fetchDashboardData();
  }

  void setCustomDateRange(DateTime start, DateTime end) {
    _dateRange = "custom";
    _customStartDate = start;
    _customEndDate = end;
    fetchDashboardData();
  }

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }


  Future<void> fetchDashboardData() async {
    _setLoading(true);
    _errorMessage = "";
    final branchId = StorageService.selectedBranchId;
    final tenantId = StorageService.tenantId;
    final role = StorageService.adminRole;

    // Dynamically calculate start and end dates based on preset range
    final now = DateTime.now();
    String start = "";
    String end = "";

    if (_dateRange == 'today') {
      final todayStr = _formatDateString(now);
      start = todayStr;
      end = todayStr;
    } else if (_dateRange == 'yesterday') {
      final yesterdayStr = _formatDateString(now.subtract(const Duration(days: 1)));
      start = yesterdayStr;
      end = yesterdayStr;
    } else if (_dateRange == '7days') {
      final sevenDaysAgoStr = _formatDateString(now.subtract(const Duration(days: 7)));
      final todayStr = _formatDateString(now);
      start = sevenDaysAgoStr;
      end = todayStr;
    } else if (_dateRange == 'month') {
      final startOfMonthStr = _formatDateString(DateTime(now.year, now.month, 1));
      final todayStr = _formatDateString(now);
      start = startOfMonthStr;
      end = todayStr;
    } else if (_dateRange == 'custom' && _customStartDate != null && _customEndDate != null) {
      start = _formatDateString(_customStartDate!);
      end = _formatDateString(_customEndDate!);
    }

    String url = '${ApiConfig.analytics}?section=all&branchId=$branchId';
    if (start.isNotEmpty) url += '&startDate=$start';
    if (end.isNotEmpty) url += '&endDate=$end';
    if (role == 'superadmin') {
      url += '&tenantId=$tenantId';
    }

    try {
      final response = await ApiClient.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Map database response directly
        _kpis = {
          'revenue': data['revenue'] ?? 0.0,
          'totalOrders': data['totalOrders'] ?? 0,
          'activeCustomers': data['totalCustomers'] ?? 0,
          'aov': data['aov'] ?? 0.0,
        };
        _revenueTrend = data['trend'] ?? [];
        _categoryShare = data['categoryRevenue'] ?? [];
        _lowStockAlerts = data['lowStock'] ?? [];
        _activityFeed = data['recentActivity'] ?? [];
      } else {
        _errorMessage = "Failed to fetch analytics metrics";
      }
    } catch (e) {
      _errorMessage = "Network connection failed";
    }
    _setLoading(false);
  }

  String _formatDateString(DateTime date) {
    return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }

  Future<void> fetchLiveUpdates() async {
    final branchId = StorageService.selectedBranchId;
    try {
      final activityRes = await ApiClient.get('${ApiConfig.analytics}/activities?branchId=$branchId');
      if (activityRes.statusCode == 200) {
        _activityFeed = jsonDecode(activityRes.body) ?? [];
      }

      final notifyRes = await ApiClient.get(ApiConfig.notifications);
      if (notifyRes.statusCode == 200) {
        _notifications = jsonDecode(notifyRes.body) ?? [];
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markNotificationsAsRead() async {
    try {
      final response = await ApiClient.post(ApiConfig.notificationsRead);
      if (response.statusCode == 200) {
        for (var n in _notifications) {
          n['isRead'] = true;
        }
        notifyListeners();
      }
    } catch (_) {}
  }
}
