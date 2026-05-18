class ApiConfig {
  static const String baseDomain = "friska-api.farmora.in";

  static String get baseUrl {
    return 'https://$baseDomain/api/admin';
  }

  static String get rootUrl {
    return 'https://$baseDomain';
  }

  static String get login => '$baseUrl/login';
  static String get tenants => '$baseUrl/tenants';
  static String get branches => '$baseUrl/branches';
  static String get supportRequests => '$baseUrl/support-requests';
  static String get categories => '$baseUrl/categories';
  static String get products => '$baseUrl/products';
  static String get productsBasic => '$baseUrl/products/basic';
  static String get orders => '$baseUrl/orders';
  static String get customers => '$baseUrl/customers';
  static String get analytics => '$baseUrl/analytics';
  static String get broadcast => '$baseUrl/customers/broadcast';
  static String get fcmRegister => '$baseUrl/fcm/register';
  static String get fcmUnregister => '$baseUrl/fcm/unregister';
  static String get notifications => '$baseUrl/notifications';
  static String get notificationsRead => '$baseUrl/notifications/read';
  static String get productSales => '$baseUrl/product-sales';
  static String get offers => '$baseUrl/offers';
  static String get whatsappSettings => '$baseUrl/tenants/me/whatsapp-settings';
  static String get changePassword => '$baseUrl/change-password';
  static String get globalConfigs => '$baseUrl/global-configs';
  static String get registrationPayment => '$rootUrl/api/payments/registration';

  static String registrationStatus(String id) =>
      '$baseUrl/tenants/$id/registration-status';
}
