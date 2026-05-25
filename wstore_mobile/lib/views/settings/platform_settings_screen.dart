import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import '../../config/api_config.dart';
import '../../services/api_client.dart';
import '../../widgets/glass_scaffold.dart';

class PlatformSettingsScreen extends StatefulWidget {
  const PlatformSettingsScreen({super.key});

  @override
  State<PlatformSettingsScreen> createState() => _PlatformSettingsScreenState();
}

class _PlatformSettingsScreenState extends State<PlatformSettingsScreen> {
  Map<String, dynamic> _configs = {};
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.get(ApiConfig.globalConfigs);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final map = <String, dynamic>{};
        for (var c in data) {
          map[c['key']] = c['value'];
        }
        setState(() => _configs = map);
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _save(String key, String value) async {
    setState(() => _saving = true);
    try {
      await ApiClient.put(ApiConfig.globalConfigs, body: {'key': key, 'value': value});
      _configs[key] = value;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved'), backgroundColor: Color(0xFF10B981)));
      }
    } catch (_) {}
    setState(() => _saving = false);
  }

  Widget _buildField(String label, String key, {TextInputType type = TextInputType.text}) {
    final ctrl = TextEditingController(text: _configs[key]?.toString() ?? '');
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: GlassInput(controller: ctrl, hint: '', keyboardType: type),
          ),
          const SizedBox(width: 8),
          SizedBox(
            height: 48,
            child: GlassButton(
              label: 'Save',
              icon: Icons.check,
              onPressed: _saving ? null : () => _save(key, ctrl.text),
              isLoading: _saving,
            ),
          ),
        ]),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      title: 'Platform Settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('Global Configuration', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 20),
                _buildField('Registration Fee (₹)', 'registration_fee', type: TextInputType.number),
                _buildField('Default Delivery Radius (km)', 'delivery_radius', type: TextInputType.number),
                _buildField('Support Email', 'support_email'),
                _buildField('Support Phone', 'support_phone'),
                _buildField('App Name', 'app_name'),
                _buildField('Primary Color (hex)', 'primary_color'),
              ]),
            ),
    );
  }
}
