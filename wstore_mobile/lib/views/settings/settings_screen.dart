import 'dart:convert';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/branches_provider.dart';
import '../../services/api_client.dart';
import '../../config/api_config.dart';
import '../../services/storage_service.dart';
import '../../widgets/glass_scaffold.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _phoneIdController = TextEditingController();
  final _metaTokenController = TextEditingController();
  final _wabaIdController = TextEditingController();
  final _googleMapsKeyController = TextEditingController();
  final _geminiKeyController = TextEditingController();
  final _storePhoneController = TextEditingController();
  final _contactNameController = TextEditingController();
  final _contactEmailController = TextEditingController();
  bool _isSavingSettings = false;
  String _settingsError = "";

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BranchesProvider>().fetchBranches();
      _fetchCurrentMetaSettings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchCurrentMetaSettings() async {
    final tenantId = StorageService.tenantId;
    if (tenantId.isEmpty) return;
    try {
      final res = await ApiClient.get('${ApiConfig.tenants}/$tenantId');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _phoneIdController.text = data['phoneNumberId'] ?? '';
          _metaTokenController.text = data['whatsappToken'] ?? '';
          _wabaIdController.text = data['wabaId'] ?? '';
          _googleMapsKeyController.text = data['googleMapsApiKey'] ?? '';
          _geminiKeyController.text = data['geminiApiKey'] ?? '';
          _storePhoneController.text = data['contactPhone'] ?? '';
          _contactNameController.text = data['contactName'] ?? '';
          _contactEmailController.text = data['contactEmail'] ?? '';
        });
      }
    } catch (_) {}
  }

  Future<void> _updateMetaSettings() async {
    if (_phoneIdController.text.isEmpty || _metaTokenController.text.isEmpty) {
      setState(() => _settingsError = "Please fill all required Meta fields");
      return;
    }

    setState(() {
      _isSavingSettings = true;
      _settingsError = "";
    });

    final tenantId = StorageService.tenantId;
    try {
      final res = await ApiClient.put(
        '${ApiConfig.tenants}/$tenantId',
        body: {
          'phoneNumberId': _phoneIdController.text.trim(),
          'whatsappToken': _metaTokenController.text.trim(),
          'wabaId': _wabaIdController.text.trim(),
          'googleMapsApiKey': _googleMapsKeyController.text.trim(),
          'geminiApiKey': _geminiKeyController.text.trim(),
          'contactPhone': _storePhoneController.text.trim(),
          'contactName': _contactNameController.text.trim(),
          'contactEmail': _contactEmailController.text.trim(),
        },
      );

      if (res.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('WhatsApp Meta settings synchronized!'), backgroundColor: Color(0xFF10B981)),
        );
      } else {
        final data = jsonDecode(res.body);
        setState(() => _settingsError = data['error'] ?? "Failed to save settings");
      }
    } catch (e) {
      setState(() => _settingsError = "Failed to communicate with server");
    }
    setState(() => _isSavingSettings = false);
  }

  void _showAddBranchDialog() {
    final nameController = TextEditingController();
    final userController = TextEditingController();
    final passController = TextEditingController();
    bool isSaving = false;
    String error = "";

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> submit() async {
              if (nameController.text.isEmpty || userController.text.isEmpty || passController.text.isEmpty) {
                setDialogState(() => error = "Please fill all branch parameters");
                return;
              }

              setDialogState(() {
                isSaving = true;
                error = "";
              });

              final success = await context.read<BranchesProvider>().createBranch({
                    'name': nameController.text.trim(),
                    'username': userController.text.trim(),
                    'password': passController.text,
                  });

              if (success && mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Branch configured successfully!'), backgroundColor: Color(0xFF10B981)),
                );
              } else {
                setDialogState(() {
                  isSaving = false;
                  error = "Failed to establish branch. Try again.";
                });
              }
            }

            return AlertDialog(
              backgroundColor: AppColors.cardBg,
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text('Create Branch Hub', style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 18)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GlassInput(controller: nameController, hint: 'Branch Hub Name (e.g. Pune City)'),
                    const SizedBox(height: 12),
                    GlassInput(controller: userController, hint: 'Admin Username'),
                    const SizedBox(height: 12),
                    GlassInput(controller: passController, hint: 'Admin Password', obscure: true),
                    if (error.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(error, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: AppColors.textSecondary)),
                ),
                TextButton(
                  onPressed: isSaving ? null : submit,
                  child: isSaving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                      : const Text('Provision', style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
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
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
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
    final branchesProvider = context.watch<BranchesProvider>();

    return GlassScaffold(
      title: 'Platform Configuration',
      bottom: TabBar(
        controller: _tabController,
        indicatorColor: AppColors.accent,
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.textMuted,
        labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
        tabs: const [
          Tab(text: 'WhatsApp Config'),
          Tab(text: 'Hubs Manager'),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('WhatsApp Meta integrations', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 6),
                Text('Define phone ID and user access token properties to support direct customer messages.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 24),
                _buildTextField(controller: _phoneIdController, label: 'Meta Phone Number ID', hint: 'e.g. 109273...'),
                _buildTextField(controller: _metaTokenController, label: 'Meta User Access Token', hint: 'EAAl...', isPassword: true),
                _buildTextField(controller: _wabaIdController, label: 'WABA ID (Optional)', hint: 'e.g. WABA1039...'),
                const Divider(height: 32, color: AppColors.border),
                Text('Additional Integrations', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                _buildTextField(controller: _googleMapsKeyController, label: 'Google Maps API Key', hint: 'AIza...', isPassword: true),
                _buildTextField(controller: _geminiKeyController, label: 'Gemini AI API Key', hint: 'Enter Gemini key for AI chat', isPassword: true),
                const Divider(height: 32, color: AppColors.border),
                Text('Store Contact Info', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                _buildTextField(controller: _storePhoneController, label: 'Store Phone', hint: '+91...'),
                _buildTextField(controller: _contactNameController, label: 'Contact Person', hint: 'Store manager name'),
                _buildTextField(controller: _contactEmailController, label: 'Contact Email', hint: 'email@store.com'),

                if (_settingsError.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.red.withOpacity(0.2)),
                    ),
                    child: Text(_settingsError, style: GoogleFonts.inter(color: AppColors.red, fontSize: 12), textAlign: TextAlign.center),
                  ),

                GlassButton(
                  label: 'Save Configuration',
                  onPressed: _isSavingSettings ? null : _updateMetaSettings,
                  isLoading: _isSavingSettings,
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Sales Branch Hubs', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    IconButton(
                      icon: const Icon(Icons.add, color: AppColors.accent),
                      onPressed: _showAddBranchDialog,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: branchesProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent)))
                      : branchesProvider.branches.isEmpty
                          ? Center(child: Text('No sales hubs configured', style: GoogleFonts.inter(color: AppColors.textMuted)))
                          : ListView.separated(
                              itemCount: branchesProvider.branches.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final b = branchesProvider.branches[index];
                                final name = b['name'] ?? 'Branch';
                                final id = b['id']?.toString() ?? 'N/A';
                                return GlassCard(
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.1), shape: BoxShape.circle),
                                        child: const Icon(Icons.store, color: AppColors.accent, size: 20),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(name, style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                                            const SizedBox(height: 4),
                                            Text('Hub ID: $id', style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 11)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
