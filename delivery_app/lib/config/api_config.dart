class ApiConfig {
  static const String baseDomain = "friska-api.farmora.in";

  static String get baseUrl {
    return 'https://$baseDomain/api/delivery';
  }

  static String get login => '$baseUrl/login';
  static String get orders => '$baseUrl/orders';
  static String get fcmRegister => '$baseUrl/fcm-token';
  static String get fcmUnregister => '$baseUrl/fcm-token';

  static String orderDetail(int id) => '$baseUrl/orders/$id';
  static String orderStatus(int id) => '$baseUrl/orders/$id/status';
}
