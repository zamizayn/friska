import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/glass_scaffold.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _isLoading = false;
  String _errorText = "";

  Future<void> _submitChange() async {
    if (_currentController.text.isEmpty || _newController.text.isEmpty) {
      setState(() => _errorText = "Please fill all password fields");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    final success = await context.read<AuthProvider>().changePassword(
          _currentController.text,
          _newController.text,
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Administrative password reset successfully!'), backgroundColor: Color(0xFF10B981)),
      );
      Navigator.pop(context);
    } else {
      final auth = context.read<AuthProvider>();
      setState(() => _errorText = auth.errorMessage.isNotEmpty ? auth.errorMessage : "Failed to reset password");
    }
    setState(() => _isLoading = false);
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              decoration: GlassStyles.input(),
              child: TextField(
                controller: controller,
                obscureText: obscure,
                style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
                  suffixIcon: IconButton(
                    icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 18),
                    onPressed: onToggle,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      title: 'Reset Credentials',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Reset Store Password', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 6),
            Text('Establish new administrative passwords for your workspace profile security.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 24),
            _buildTextField(
              controller: _currentController,
              label: 'Current Password',
              hint: '••••••••',
              obscure: _obscureCurrent,
              onToggle: () => setState(() => _obscureCurrent = !_obscureCurrent),
            ),
            _buildTextField(
              controller: _newController,
              label: 'New Secure Password',
              hint: '••••••••',
              obscure: _obscureNew,
              onToggle: () => setState(() => _obscureNew = !_obscureNew),
            ),
            if (_errorText.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppColors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.red.withOpacity(0.2)),
                ),
                child: Text(_errorText, style: GoogleFonts.inter(color: AppColors.red, fontSize: 12), textAlign: TextAlign.center),
              ),
            ],
            const SizedBox(height: 14),
            GlassButton(
              label: 'Update Password',
              onPressed: _isLoading ? null : _submitChange,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
