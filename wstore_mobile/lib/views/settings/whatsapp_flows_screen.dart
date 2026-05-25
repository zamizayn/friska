import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/api_config.dart';
import '../../config/theme_config.dart';
import '../../services/api_client.dart';
import '../../widgets/glass_scaffold.dart';

class WhatsAppFlowsScreen extends StatefulWidget {
  const WhatsAppFlowsScreen({super.key});

  @override
  State<WhatsAppFlowsScreen> createState() => _WhatsAppFlowsScreenState();
}

class _WhatsAppFlowsScreenState extends State<WhatsAppFlowsScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  
  final Map<String, TextEditingController> _controllers = {
    'welcomeReturning': TextEditingController(),
    'welcomeNew': TextEditingController(),
    'menuTriggers': TextEditingController(),
    'searchProductsMessage': TextEditingController(),
    'chooseBranchMessage': TextEditingController(),
    'cartEmptyMessage': TextEditingController(),
    'enterAddressMessage': TextEditingController(),
    'selectAddressMessage': TextEditingController(),
    'paymentMethodMessage': TextEditingController(),
    'orderConfirmedMessage': TextEditingController(),
    'supportMessage': TextEditingController(),
    'abandonedCartMessage': TextEditingController(),
  };

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchSettings() async {
    try {
      final res = await ApiClient.get(ApiConfig.whatsappSettings);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          for (var key in _controllers.keys) {
            if (data[key] != null) {
              _controllers[key]!.text = data[key];
            }
          }
        });
      }
    } catch (_) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    try {
      final body = <String, String>{};
      for (var entry in _controllers.entries) {
        body[entry.key] = entry.value.text;
      }
      
      final res = await ApiClient.put(ApiConfig.whatsappSettings, body: body);
      if (res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('WhatsApp flows saved successfully!'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to save settings'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    } catch (_) {
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Widget _buildSection(String title, IconData icon, Color iconColor, List<Widget> fields) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...fields,
        ],
      ),
    );
  }

  Widget _buildField(String key, String label, String hint) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          if (hint.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              hint,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ],
          const SizedBox(height: 8),
          GlassInput(
            controller: _controllers[key]!,
            hint: hint,
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      title: 'WhatsApp Flows',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Personalize the automated messages your customers receive on WhatsApp.',
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 24),
                  _buildSection(
                    'Greetings & Welcome',
                    Icons.auto_awesome,
                    AppColors.accent,
                    [
                      _buildField('welcomeReturning', 'Returning Customer Welcome', 'Placeholders: {{tenant_name}}, {{customer_name}}'),
                      _buildField('welcomeNew', 'New Customer Welcome', 'Placeholders: {{tenant_name}}'),
                      _buildField('menuTriggers', 'Custom Menu Triggers (Comma-separated)', 'Words that trigger the main menu (e.g. hey, hello, hii)'),
                    ],
                  ),
                  _buildSection(
                    'Shopping Experience',
                    Icons.shopping_bag,
                    AppColors.green,
                    [
                      _buildField('searchProductsMessage', 'Product Search Prompt', ''),
                      _buildField('chooseBranchMessage', 'Branch Selection', ''),
                      _buildField('cartEmptyMessage', 'Empty Cart Message', ''),
                    ],
                  ),
                  _buildSection(
                    'Checkout Flow',
                    Icons.inventory_2,
                    AppColors.amber,
                    [
                      _buildField('enterAddressMessage', 'Address Collection', ''),
                      _buildField('selectAddressMessage', 'Select Saved Address Prompt', ''),
                      _buildField('paymentMethodMessage', 'Payment Method Selection', ''),
                      _buildField('orderConfirmedMessage', 'Order Confirmation', 'Placeholders: {{order_id}}, {{payment_method}}'),
                    ],
                  ),
                  _buildSection(
                    'Support & Engagement',
                    Icons.support_agent,
                    AppColors.red,
                    [
                      _buildField('supportMessage', 'Help & Support Intro', ''),
                      _buildField('abandonedCartMessage', 'Abandoned Cart Reminder', ''),
                    ],
                  ),
                  const SizedBox(height: 24),
                  GlassButton(
                    label: 'Save Flows',
                    icon: Icons.save,
                    onPressed: _isSaving ? null : _saveSettings,
                    isLoading: _isSaving,
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
