import 'dart:convert';
import 'package:http/http.dart' as http;
import 'storage_service.dart';

class ApiClient {
  static Map<String, String> getHeaders() {
    final token = StorageService.deliveryToken;
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<http.Response> get(String url) async {
    final uri = Uri.parse(url);
    return await http.get(uri, headers: getHeaders());
  }

  static Future<http.Response> post(String url, {Object? body}) async {
    final uri = Uri.parse(url);
    return await http.post(
      uri,
      headers: getHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
  }

  static Future<http.Response> put(String url, {Object? body}) async {
    final uri = Uri.parse(url);
    return await http.put(
      uri,
      headers: getHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
  }

  static Future<http.Response> delete(String url, {Object? body}) async {
    final uri = Uri.parse(url);
    return await http.delete(
      uri,
      headers: getHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
  }
}
