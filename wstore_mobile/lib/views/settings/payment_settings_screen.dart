import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/api_config.dart';
import '../../config/theme_config.dart';
import '../../services/api_client.dart';
import '../../services/storage_service.dart';
import '../../widgets/glass_scaffold.dart';

class PaymentSettingsScreen extends StatefulWidget {
  const PaymentSettingsScreen({super.key});

  @override
  State<PaymentSettingsScreen> createState() => _PaymentSettingsScreenState();
}

class _PaymentSettingsScreenState extends State<PaymentSettingsScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  final TextEditingController _rzpKeyIdController = TextEditingController();
  final TextEditingController _rzpKeySecretController = TextEditingController();
  final TextEditingController _rzpWebhookSecretController = TextEditingController();
  bool _codEnabled = false;

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  @override
  void dispose() {
    _rzpKeyIdController.dispose();
    _rzpKeySecretController.dispose();
    super.dispose();
  }

  Future<void> _fetchSettings() async {
    try {
      final tenantId = StorageService.tenantId;
      if (tenantId.isEmpty) return;

      final res = await ApiClient.get('${ApiConfig.tenants}/me/settings');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
          _rzpKeyIdController.text = data['razorpayKeyId'] ?? '';
          _rzpKeySecretController.text = data['razorpayKeySecret'] ?? '';
          _rzpWebhookSecretController.text = data['razorpayWebhookSecret'] ?? '';
          _codEnabled = data['codEnabled'] ?? false;
          });
        }
      }
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _saveSettings() async {
    if (_rzpKeyIdController.text.isNotEmpty && _rzpKeySecretController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide Razorpay Key Secret'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final res = await ApiClient.put(
        '${ApiConfig.tenants}/me/settings',
        body: {
          'razorpayKeyId': _rzpKeyIdController.text.trim(),
          'razorpayKeySecret': _rzpKeySecretController.text.trim(),
          'razorpayWebhookSecret': _rzpWebhookSecretController.text.trim(),
          'codEnabled': _codEnabled,
        },
      );

      if (res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment settings updated successfully!'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update payment settings'), backgroundColor: Colors.redAccent),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    bool isPassword = false,
  }) {
    return Column(
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
        const SizedBox(height: 8),
        GlassInput(
          controller: controller,
          hint: hint,
          obscure: isPassword,
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      title: 'Payment Options',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  GlassCard(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.green.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.money, color: AppColors.green, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Cash on Delivery', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                              const SizedBox(height: 2),
                              Text('Allow customers to pay when they receive their order.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        Switch(
                          value: _codEnabled,
                          onChanged: (val) => setState(() => _codEnabled = val),
                          activeColor: AppColors.green,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  GlassCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppColors.accent.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.credit_card, color: AppColors.accent, size: 24),
                            ),
                            const SizedBox(width: 16),
                            Text('Razorpay Integration', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _buildTextField(
                          controller: _rzpKeyIdController,
                          label: 'Razorpay Key ID',
                          hint: 'rzp_test_...',
                        ),
                        _buildTextField(
                          controller: _rzpKeySecretController,
                          label: 'Razorpay Key Secret',
                          hint: 'Enter your secret key',
                          isPassword: true,
                        ),
                        _buildTextField(
                          controller: _rzpWebhookSecretController,
                          label: 'Razorpay Webhook Secret',
                          hint: 'Enter webhook secret',
                          isPassword: true,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Your keys are securely encrypted before storage. Leaving these fields blank will disable Razorpay on your store checkout.',
                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  GlassButton(
                    label: 'Save Settings',
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
