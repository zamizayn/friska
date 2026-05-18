import 'dart:convert';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/api_config.dart';
import '../../services/api_client.dart';
import '../auth/login_screen.dart';
import 'payment_screen.dart';

class WizardScreen extends StatefulWidget {
  final String? tenantId;
  final int initialStep;

  const WizardScreen({
    super.key,
    this.tenantId,
    this.initialStep = 1,
  });

  @override
  State<WizardScreen> createState() => _WizardScreenState();
}

class _WizardScreenState extends State<WizardScreen> {
  int _currentStep = 1;
  bool _isLoading = false;
  String _errorText = "";
  String? _createdTenantId;

  final _businessNameController = TextEditingController();
  final _contactNameController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  final _contactEmailController = TextEditingController();
  final _adminUsernameController = TextEditingController();
  final _adminPasswordController = TextEditingController();

  final _phoneIdController = TextEditingController();
  final _metaTokenController = TextEditingController();
  final _wabaIdController = TextEditingController();

  final _branchNameController = TextEditingController();
  final _branchUsernameController = TextEditingController();
  final _branchPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _currentStep = widget.initialStep;
    _createdTenantId = widget.tenantId;

    if (_createdTenantId != null) {
      _fetchTenantStatus();
    }
  }

  Future<void> _fetchTenantStatus() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.get(ApiConfig.registrationStatus(_createdTenantId!));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _businessNameController.text = data['name'] ?? '';
        });
      }
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  Future<void> _handleTenantSubmit() async {
    if (_businessNameController.text.isEmpty ||
        _contactNameController.text.isEmpty ||
        _contactPhoneController.text.isEmpty ||
        _contactEmailController.text.isEmpty ||
        _adminUsernameController.text.isEmpty ||
        _adminPasswordController.text.isEmpty) {
      setState(() => _errorText = "Please fill all required business fields");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    try {
      final isUpdate = _createdTenantId != null;
      final url = isUpdate ? '${ApiConfig.tenants}/$_createdTenantId' : ApiConfig.tenants;
      final method = isUpdate ? 'PUT' : 'POST';

      final body = {
        'name': _businessNameController.text,
        'contactName': _contactNameController.text,
        'contactPhone': _contactPhoneController.text,
        'contactEmail': _contactEmailController.text,
        'username': _adminUsernameController.text,
        'password': _adminPasswordController.text,
      };

      final res = await (method == 'PUT'
          ? ApiClient.put(url, body: body)
          : ApiClient.post(url, body: body));
      
      final data = jsonDecode(res.body);

      if (res.statusCode == 200 || res.statusCode == 201) {
        if (isUpdate) {
          setState(() {
            _currentStep = 2;
          });
        } else {
          _createdTenantId = data['id']?.toString();
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => PaymentScreen(tenantId: _createdTenantId!),
            ),
          );
        }
      } else {
        setState(() => _errorText = data['error'] ?? "Failed to register tenant");
      }
    } catch (e) {
      setState(() => _errorText = "Network connection failed");
    }
    setState(() => _isLoading = false);
  }

  Future<void> _handleMetaSubmit() async {
    if (_phoneIdController.text.isEmpty || _metaTokenController.text.isEmpty) {
      setState(() => _errorText = "Please fill required Meta configurations");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    try {
      final body = {
        'name': _businessNameController.text,
        'contactName': _contactNameController.text,
        'contactPhone': _contactPhoneController.text,
        'contactEmail': _contactEmailController.text,
        'username': _adminUsernameController.text,
        'password': _adminPasswordController.text,
        'phoneNumberId': _phoneIdController.text,
        'whatsappToken': _metaTokenController.text,
        'wabaId': _wabaIdController.text,
      };

      final res = await ApiClient.put(
        '${ApiConfig.tenants}/$_createdTenantId',
        body: body,
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200 || res.statusCode == 201) {
        setState(() {
          _currentStep = 3;
        });
      } else {
        setState(() => _errorText = data['error'] ?? "Failed to save Meta settings");
      }
    } catch (e) {
      setState(() => _errorText = "Failed to connect to backend");
    }
    setState(() => _isLoading = false);
  }

  Future<void> _handleBranchSubmit() async {
    if (_branchNameController.text.isEmpty ||
        _branchUsernameController.text.isEmpty ||
        _branchPasswordController.text.isEmpty) {
      setState(() => _errorText = "Please fill all branch administrative details");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    try {
      final res = await ApiClient.post(
        ApiConfig.branches,
        body: {
          'name': _branchNameController.text,
          'username': _branchUsernameController.text,
          'password': _branchPasswordController.text,
          'tenantId': _createdTenantId,
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        _showSuccessDialog();
      } else {
        final data = jsonDecode(res.body);
        setState(() => _errorText = data['error'] ?? "Failed to create branch");
      }
    } catch (e) {
      setState(() => _errorText = "Network connection failed");
    }
    setState(() => _isLoading = false);
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: const [
              Icon(Icons.check_circle, color: Color(0xFF10B981), size: 28),
              SizedBox(width: 10),
              Text('Onboarding Complete', style: TextStyle(color: AppColors.textPrimary)),
            ],
          ),
          content: const Text(
            'Your business, Meta integration, and first branch have been successfully provisioned. You can now log in with your credentials.',
            style: TextStyle(color: Color(0xFF94A3B8)),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Back to Login', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    IconData? icon,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.cardOpacityBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: TextField(
            controller: controller,
            obscureText: isPassword,
            keyboardType: keyboardType,
            style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.inter(color: const Color(0xFF475569)),
              prefixIcon: icon != null ? Icon(icon, color: const Color(0xFF6366F1), size: 20) : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Business Setup Wizard',
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
      ),
      body: Stack(
        children: [
          Positioned(
            top: -150,
            left: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withOpacity(0.08),
                    blurRadius: 100,
                    spreadRadius: 80,
                  ),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 10),
                // Stepper Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildStepDot(1, 'Business'),
                    _buildStepLine(1),
                    _buildStepDot(2, 'WhatsApp'),
                    _buildStepLine(2),
                    _buildStepDot(3, 'Branch'),
                  ],
                ),
                const SizedBox(height: 24),
                if (_errorText.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error, color: Color(0xFFEF4444), size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorText,
                              style: GoogleFonts.inter(color: const Color(0xFFFCA5A5), fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 10),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: AnimatedSize(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                      child: _buildFormStep(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStepDot(int step, String title) {
    bool isCompleted = _currentStep > step;
    bool isActive = _currentStep == step;

    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive
                ? const Color(0xFF6366F1)
                : isCompleted
                    ? const Color(0xFF6366F1).withOpacity(0.2)
                    : Colors.white.withOpacity(0.05),
            border: Border.all(
              color: isActive
                  ? const Color(0xFF6366F1)
                  : isCompleted
                      ? const Color(0xFF6366F1).withOpacity(0.3)
                      : Colors.white.withOpacity(0.1),
            ),
          ),
          child: isCompleted
              ? const Icon(Icons.check, color: AppColors.textPrimary, size: 16)
              : Text(
                  step.toString(),
                  style: GoogleFonts.outfit(
                    color: isActive || isCompleted ? Colors.white : const Color(0xFF94A3B8),
                    fontWeight: FontWeight.bold,
                  ),
                ),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 11,
            color: isActive ? Colors.white : const Color(0xFF475569),
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(int afterStep) {
    bool isCompleted = _currentStep > afterStep;
    return Container(
      width: 45,
      height: 2,
      margin: const EdgeInsets.only(bottom: 18),
      color: isCompleted ? const Color(0xFF6366F1) : AppColors.cardBorder,
    );
  }

  Widget _buildFormStep() {
    switch (_currentStep) {
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              "Tell us about your Business",
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              "Enter credentials to establish administrative systems.",
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B)),
            ),
            const SizedBox(height: 24),
            _buildTextField(
              controller: _businessNameController,
              label: "Business Name",
              hint: "e.g. Starbucks India",
              icon: Icons.business,
            ),
            Row(
              children: [
                Expanded(
                  child: _buildTextField(
                    controller: _contactNameController,
                    label: "Contact Person Name",
                    hint: "John Doe",
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: _buildTextField(
                    controller: _contactPhoneController,
                    label: "Contact Phone",
                    hint: "+91...",
                    keyboardType: TextInputType.phone,
                  ),
                ),
              ],
            ),
            _buildTextField(
              controller: _contactEmailController,
              label: "Business Email ID",
              hint: "admin@business.com",
              icon: Icons.email,
              keyboardType: TextInputType.emailAddress,
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.04),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    "Set Admin Credentials",
                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF818CF8)),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          controller: _adminUsernameController,
                          label: "Username",
                          hint: "tenant_admin",
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: _buildTextField(
                          controller: _adminPasswordController,
                          label: "Password",
                          hint: "••••••••",
                          isPassword: true,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFA855F7)]),
              ),
              child: ElevatedButton(
                onPressed: _handleTenantSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Continue to Payment', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward, size: 18, color: AppColors.textPrimary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        );
      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              "WhatsApp Meta Integration",
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              "Sync catalog lists direct to your WhatsApp Business accounts.",
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B)),
            ),
            const SizedBox(height: 24),
            _buildTextField(
              controller: _phoneIdController,
              label: "Meta Phone Number ID",
              hint: "e.g. 109273...",
              icon: Icons.phone_android,
            ),
            _buildTextField(
              controller: _metaTokenController,
              label: "Meta System User Access Token",
              hint: "EAAl...",
              icon: Icons.vpn_key,
              isPassword: true,
            ),
            _buildTextField(
              controller: _wabaIdController,
              label: "WABA ID (Optional)",
              hint: "Business Account ID",
              icon: Icons.business_center,
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _currentStep = 1),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.textPrimary.withOpacity(0.1)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text("Back", style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  flex: 2,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFA855F7)]),
                    ),
                    child: ElevatedButton(
                      onPressed: _handleMetaSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text('Provision Tenant', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
          ],
        );
      case 3:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              "Create your First Branch",
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              "Establish the initial sales branch for your customers.",
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B)),
            ),
            const SizedBox(height: 24),
            _buildTextField(
              controller: _branchNameController,
              label: "Branch Name",
              hint: "e.g. Mumbai BKC",
              icon: Icons.store,
            ),
            Row(
              children: [
                Expanded(
                  child: _buildTextField(
                    controller: _branchUsernameController,
                    label: "Branch Admin Username",
                    hint: "bkc_admin",
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: _buildTextField(
                    controller: _branchPasswordController,
                    label: "Branch Admin Password",
                    hint: "••••••••",
                    isPassword: true,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
              ),
              child: ElevatedButton(
                onPressed: _handleBranchSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text('Complete Setup & Launch 🚀', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              ),
            ),
            const SizedBox(height: 40),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }
}