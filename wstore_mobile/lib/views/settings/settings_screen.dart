import 'dart:convert';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/branches_provider.dart';
import '../../services/api_client.dart';
import '../../config/api_config.dart';
import '../../services/storage_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // WhatsApp Settings Controllers
  final _phoneIdController = TextEditingController();
  final _metaTokenController = TextEditingController();
  final _wabaIdController = TextEditingController();
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

              final success = await context.read<BranchesProvider>().createBranch(
                    nameController.text.trim(),
                    userController.text.trim(),
                    passController.text,
                  );

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
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text('Create Branch Hub', style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 18)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Branch Hub Name (e.g. Pune City)',
                        hintStyle: const TextStyle(color: AppColors.textPrimary24),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: userController,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Admin Username',
                        hintStyle: const TextStyle(color: AppColors.textPrimary24),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: passController,
                      obscureText: true,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Admin Password',
                        hintStyle: const TextStyle(color: AppColors.textPrimary24),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
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
                  child: const Text('Cancel', style: TextStyle(color: AppColors.textPrimary54)),
                ),
                TextButton(
                  onPressed: isSaving ? null : submit,
                  child: isSaving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                      : const Text('Provision', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
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
            color: const Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: TextField(
            controller: controller,
            obscureText: isPassword,
            style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.inter(color: const Color(0xFF475569)),
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
    final branchesProvider = context.watch<BranchesProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Platform Configuration', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF6366F1),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF475569),
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'WhatsApp Config'),
            Tab(text: 'Hubs Manager'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // WhatsApp Meta config tab
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('WhatsApp Meta integrations', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 6),
                Text('Define phone ID and user access token properties to support direct customer messages.', style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B))),
                const SizedBox(height: 24),
                _buildTextField(controller: _phoneIdController, label: 'Meta Phone Number ID', hint: 'e.g. 109273...'),
                _buildTextField(controller: _metaTokenController, label: 'Meta User Access Token', hint: 'EAAl...', isPassword: true),
                _buildTextField(controller: _wabaIdController, label: 'WABA ID (Optional)', hint: 'e.g. WABA1039...'),
                
                if (_settingsError.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2))),
                    child: Text(_settingsError, style: GoogleFonts.inter(color: const Color(0xFFFCA5A5), fontSize: 12), textAlign: TextAlign.center),
                  ),
                ],

                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFA855F7)]),
                  ),
                  child: ElevatedButton(
                    onPressed: _isSavingSettings ? null : _updateMetaSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isSavingSettings
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                        : Text('Save Configuration', style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
          // Branches logs tab
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
                      icon: const Icon(Icons.add, color: Color(0xFF6366F1)),
                      onPressed: _showAddBranchDialog,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: branchesProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))))
                      : branchesProvider.branches.isEmpty
                          ? Center(child: Text('No sales hubs configured', style: GoogleFonts.inter(color: const Color(0xFF475569))))
                          : ListView.separated(
                              itemCount: branchesProvider.branches.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final b = branchesProvider.branches[index];
                                final name = b['name'] ?? 'Branch';
                                final id = b['id']?.toString() ?? 'N/A';
                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppColors.cardBg,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: AppColors.cardBorder),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(color: const Color(0xFF6366F1).withOpacity(0.1), shape: BoxShape.circle),
                                        child: const Icon(Icons.store, color: Color(0xFF6366F1), size: 20),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(name, style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                                            const SizedBox(height: 4),
                                            Text('Hub ID: $id', style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 11)),
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