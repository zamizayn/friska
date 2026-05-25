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

  static String get deliveryToken => getString('deliveryToken');
  static Future<bool> setDeliveryToken(String val) =>
      setString('deliveryToken', val);

  static String get deliveryName => getString('deliveryName');
  static Future<bool> setDeliveryName(String val) =>
      setString('deliveryName', val);

  static String get deliveryPhone => getString('deliveryPhone');
  static Future<bool> setDeliveryPhone(String val) =>
      setString('deliveryPhone', val);

  static String get deliveryBranchId => getString('deliveryBranchId');
  static Future<bool> setDeliveryBranchId(String val) =>
      setString('deliveryBranchId', val);

  static String get deliveryBranchName => getString('deliveryBranchName');
  static Future<bool> setDeliveryBranchName(String val) =>
      setString('deliveryBranchName', val);

  static String get fcmToken => getString('fcmToken');
  static Future<bool> setFcmToken(String val) => setString('fcmToken', val);

  static Future<void> logout() async {
    await remove('deliveryToken');
    await remove('deliveryName');
    await remove('deliveryPhone');
    await remove('deliveryBranchId');
    await remove('deliveryBranchName');
    await remove('fcmToken');
  }
}
