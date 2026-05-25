import 'dart:convert';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import '../../config/api_config.dart';
import '../../services/api_client.dart';
import 'wizard_screen.dart';

class PaymentScreen extends StatefulWidget {
  final String tenantId;

  const PaymentScreen({super.key, required this.tenantId});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _isLoading = false;
  String _errorText = "";

  Future<void> _processPaymentSimulation() async {
    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    try {
      final response = await ApiClient.post(
        ApiConfig.registrationPayment,
        body: {'tenantId': widget.tenantId, 'amount': 9999.00},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _showSuccessSnackbar();
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (context) => WizardScreen(tenantId: widget.tenantId, initialStep: 2),
            ),
            (route) => false,
          );
        }
      } else {
        final data = jsonDecode(response.body);
        setState(() => _errorText = data['error'] ?? 'Payment authorization failed');
      }
    } catch (e) {
      setState(() => _errorText = 'Payment simulation connection failed');
    }
    setState(() => _isLoading = false);
  }

  void _showSuccessSnackbar() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Payment Authorized Successfully! Proceeding to Step 2.'),
        backgroundColor: AppColors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      noAppBar: true,
      body: Stack(
        children: [
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.blue.withOpacity(0.08),
                    blurRadius: 100,
                    spreadRadius: 60,
                  ),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.blue.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.shield, color: AppColors.blue, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        'Razorpay Secure Pay',
                        style: TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'PLATFORM SUBSCRIPTION',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.blue,
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Tenant Setup & Registration Fee',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Divider(color: AppColors.textPrimary10),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Setup Cost',
                              style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted, fontSize: 14),
                            ),
                            Text(
                              '₹9,999.00',
                              style: TextStyle(fontFamily: 'Outfit', color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Platform GST (0%)',
                              style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted, fontSize: 14),
                            ),
                            Text(
                              '₹0.00',
                              style: TextStyle(fontFamily: 'Outfit', color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Divider(color: AppColors.textPrimary10),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Grand Total',
                              style: TextStyle(fontFamily: 'Outfit', color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 16),
                            ),
                            Text(
                              '₹9,999.00',
                              style: TextStyle(
                                fontFamily: 'Outfit',
                                color: AppColors.green,
                                fontWeight: FontWeight.w900,
                                fontSize: 24,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  if (_errorText.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: AppColors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.red.withOpacity(0.2)),
                      ),
                      child: Text(
                        _errorText,
                        style: const TextStyle(fontFamily: 'Inter', color: Color(0xFFFCA5A5), fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  GlassButton(
                    label: 'Authorize & Simulate Payment (₹9,999)',
                    onPressed: _isLoading ? null : _processPaymentSimulation,
                    isLoading: _isLoading,
                  ),
                  const SizedBox(height: 14),
                  OutlinedButton(
                    onPressed: _isLoading
                        ? null
                        : () {
                            Navigator.of(context).pop();
                          },
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.cardBorder),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(
                      'Cancel Payment',
                      style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
