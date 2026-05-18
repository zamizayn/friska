import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<bool> setString(String key, String value) async {
    return await _prefs?.setString(key, value) ?? false;
  }

  static String getString(String key, {String defaultValue = ""}) {
    return _prefs?.getString(key) ?? defaultValue;
  }

  static Future<bool> remove(String key) async {
    return await _prefs?.remove(key) ?? false;
  }

  static Future<bool> clear() async {
    return await _prefs?.clear() ?? false;
  }

  static String get adminToken => getString('adminToken');
  static Future<bool> setAdminToken(String val) => setString('adminToken', val);

  static String get adminRole => getString('adminRole');
  static Future<bool> setAdminRole(String val) => setString('adminRole', val);

  static String get branchId => getString('branchId');
  static Future<bool> setBranchId(String val) => setString('branchId', val);

  static String get branchName => getString('branchName');
  static Future<bool> setBranchName(String val) => setString('branchName', val);

  static String get selectedBranchId => getString('selectedBranchId');
  static Future<bool> setSelectedBranchId(String val) => setString('selectedBranchId', val);

  static String get tenantName => getString('tenantName');
  static Future<bool> setTenantName(String val) => setString('tenantName', val);

  static String get tenantId => getString('tenantId');
  static Future<bool> setTenantId(String val) => setString('tenantId', val);

  static String get fcmToken => getString('fcmToken');
  static Future<bool> setFcmToken(String val) => setString('fcmToken', val);

  static Future<void> logout() async {
    await remove('adminToken');
    await remove('adminRole');
    await remove('branchId');
    await remove('branchName');
    await remove('selectedBranchId');
    await remove('tenantName');
    await remove('tenantId');
    await remove('fcmToken');
  }
}
