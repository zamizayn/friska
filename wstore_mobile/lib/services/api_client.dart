import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'storage_service.dart';

class ApiClient {
  static Map<String, String> getHeaders({bool isMultipart = false}) {
    final token = StorageService.adminToken;
    final headers = <String, String>{};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
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

  static Future<http.Response> uploadFile(
    String url, {
    required String method,
    required Map<String, String> fields,
    String? fileFieldName,
    File? file,
  }) async {
    final uri = Uri.parse(url);
    final request = http.MultipartRequest(method, uri);

    request.headers.addAll(getHeaders(isMultipart: true));
    request.fields.addAll(fields);

    if (file != null && fileFieldName != null) {
      final multipartFile = await http.MultipartFile.fromPath(
        fileFieldName,
        file.path,
      );
      request.files.add(multipartFile);
    }

    final streamedResponse = await request.send();
    return await http.Response.fromStream(streamedResponse);
  }
}
