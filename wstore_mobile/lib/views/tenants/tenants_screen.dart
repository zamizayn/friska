import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/api_config.dart';
import '../../config/theme_config.dart';
import '../../services/api_client.dart';

class TenantsScreen extends StatefulWidget {
  const TenantsScreen({super.key});

  @override
  State<TenantsScreen> createState() => _TenantsScreenState();
}

class _TenantsScreenState extends State<TenantsScreen> {
  bool _isLoading = true;
  List<dynamic> _tenants = [];

  @override
  void initState() {
    super.initState();
    _fetchTenants();
  }

  Future<void> _fetchTenants() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.get(ApiConfig.tenants);
      if (res.statusCode == 200) {
        if (mounted) {
          setState(() {
            _tenants = jsonDecode(res.body) ?? [];
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

  Future<void> _deleteTenant(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Delete Tenant?',
            style: GoogleFonts.outfit(
                color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        content: Text(
            'Are you sure you want to delete this tenant? This action cannot be undone.',
            style: GoogleFonts.inter(color: AppColors.textSecondary)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiClient.delete('${ApiConfig.tenants}/$id');
        _fetchTenants();
      } catch (_) {}
    }
  }

  Future<void> _enableWebhooks(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Enable Meta Webhooks?',
            style: GoogleFonts.outfit(
                color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        content: Text(
            'This will subscribe the WhatsApp account to your Friska app on Meta.',
            style: GoogleFonts.inter(color: AppColors.textSecondary)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            child: const Text('Enable'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final res =
            await ApiClient.post('${ApiConfig.tenants}/$id}/enable-webhooks');
        if (res.statusCode == 200) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Webhooks successfully enabled!'),
                backgroundColor: Color(0xFF10B981)));
            _fetchTenants();
          }
        }
      } catch (_) {}
    }
  }

  void _showTenantModal({Map<String, dynamic>? tenant}) {
    final nameCtrl = TextEditingController(text: tenant?['name']);
    final phoneIdCtrl = TextEditingController(text: tenant?['phoneNumberId']);
    final wabaCtrl = TextEditingController(text: tenant?['wabaId']);
    final tokenCtrl = TextEditingController(text: tenant?['whatsappToken']);
    final catalogCtrl = TextEditingController(text: tenant?['catalogId']);
    final userCtrl = TextEditingController(text: tenant?['username']);
    final passCtrl = TextEditingController();

    String displayMode = tenant?['displayMode'] ?? 'catalog';
    bool isActive = tenant?['isActive'] ?? true;
    bool isSaving = false;

    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) {
          return StatefulBuilder(
            builder: (context, setModalState) {
              return Container(
                height: MediaQuery.of(context).size.height * 0.9,
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        color: AppColors.surface,
                        borderRadius:
                            BorderRadius.vertical(top: Radius.circular(24)),
                        border:
                            Border(bottom: BorderSide(color: AppColors.border)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            tenant == null ? 'New Tenant' : 'Edit Tenant',
                            style: GoogleFonts.outfit(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close,
                                color: AppColors.textPrimary),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildField(nameCtrl, 'Business Name',
                                'e.g. Aventus Informatics'),
                            Row(
                              children: [
                                Expanded(
                                    child: _buildField(phoneIdCtrl,
                                        'Meta Phone ID', 'e.g. 109...')),
                                const SizedBox(width: 16),
                                Expanded(
                                    child: _buildField(wabaCtrl, 'Meta WABA ID',
                                        'e.g. 108...')),
                              ],
                            ),
                            _buildField(
                                tokenCtrl, 'Meta Access Token', 'EAAL...',
                                isPassword: true),
                            _buildField(
                                catalogCtrl,
                                'Meta Catalog ID (Optional)',
                                'Enter Catalog ID'),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Display Mode (Chatbot)',
                                      style: GoogleFonts.outfit(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textPrimary)),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16),
                                    decoration: BoxDecoration(
                                      color: AppColors.inputBg,
                                      borderRadius: BorderRadius.circular(12),
                                      border:
                                          Border.all(color: AppColors.border),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: displayMode,
                                        isExpanded: true,
                                        dropdownColor: AppColors.surface,
                                        items: const [
                                          DropdownMenuItem(
                                              value: 'catalog',
                                              child: Text(
                                                  'Vertical List (Meta Catalog)')),
                                          DropdownMenuItem(
                                              value: 'carousel',
                                              child: Text(
                                                  'Horizontal Carousel (Custom Cards)')),
                                        ],
                                        onChanged: (v) => setModalState(
                                            () => displayMode = v!),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                  color:
                                      const Color(0xFF6366F1).withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(16)),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Admin Credentials',
                                      style: GoogleFonts.outfit(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF6366F1))),
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      Expanded(
                                          child: _buildField(
                                              userCtrl, 'Username', 'admin',
                                              bottomPadding: 0)),
                                      const SizedBox(width: 16),
                                      Expanded(
                                          child: _buildField(
                                              passCtrl,
                                              'Password',
                                              tenant == null
                                                  ? '••••••••'
                                                  : 'Leave blank',
                                              isPassword: true,
                                              bottomPadding: 0)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),
                            Row(
                              children: [
                                Switch(
                                  value: isActive,
                                  onChanged: (v) =>
                                      setModalState(() => isActive = v),
                                  activeColor: const Color(0xFF10B981),
                                ),
                                const SizedBox(width: 8),
                                Text('Active and enabled',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimary)),
                              ],
                            ),
                            const SizedBox(height: 32),
                            SizedBox(
                              height: 54,
                              child: ElevatedButton(
                                onPressed: isSaving
                                    ? null
                                    : () async {
                                        setModalState(() => isSaving = true);
                                        final body = {
                                          'name': nameCtrl.text.trim(),
                                          'phoneNumberId':
                                              phoneIdCtrl.text.trim(),
                                          'wabaId': wabaCtrl.text.trim(),
                                          'whatsappToken':
                                              tokenCtrl.text.trim(),
                                          'catalogId': catalogCtrl.text.trim(),
                                          'displayMode': displayMode,
                                          'username': userCtrl.text.trim(),
                                          'password': passCtrl.text,
                                          'isActive': isActive,
                                        };

                                        try {
                                          final url = tenant == null
                                              ? ApiConfig.tenants
                                              : '${ApiConfig.tenants}/${tenant['id']}';
                                          final res = tenant == null
                                              ? await ApiClient.post(url,
                                                  body: body)
                                              : await ApiClient.put(url,
                                                  body: body);

                                          if (res.statusCode == 200 ||
                                              res.statusCode == 201) {
                                            if (context.mounted) {
                                              Navigator.pop(context);
                                              _fetchTenants();
                                            }
                                          } else {
                                            if (context.mounted) {
                                              ScaffoldMessenger.of(context)
                                                  .showSnackBar(const SnackBar(
                                                      content: Text(
                                                          'Failed to save tenant'),
                                                      backgroundColor:
                                                          Colors.redAccent));
                                            }
                                          }
                                        } finally {
                                          setModalState(() => isSaving = false);
                                        }
                                      },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14)),
                                ),
                                child: isSaving
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                            color: Colors.white,
                                            strokeWidth: 2))
                                    : Text(
                                        tenant == null
                                            ? 'Create Tenant'
                                            : 'Save Changes',
                                        style: GoogleFonts.outfit(
                                            color: Colors.white,
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        });
  }

  Widget _buildField(
      TextEditingController controller, String label, String hint,
      {bool isPassword = false, double bottomPadding = 16}) {
    return Padding(
      padding: EdgeInsets.only(bottom: bottomPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            obscureText: isPassword,
            style:
                GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
              filled: true,
              fillColor: AppColors.inputBg,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Platform Tenants',
                style: GoogleFonts.outfit(
                    color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
            Text('Manage businesses & Meta configs',
                style: GoogleFonts.inter(
                    color: AppColors.textSecondary, fontSize: 11)),
          ],
        ),
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: TextButton.icon(
              onPressed: () => _showTenantModal(),
              icon: const Icon(Icons.add, color: Colors.white, size: 18),
              label: Text('Add Tenant',
                  style: GoogleFonts.outfit(
                      color: Colors.white, fontWeight: FontWeight.w600)),
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          )
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)))
          : _tenants.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.business,
                          size: 64,
                          color: AppColors.textMuted.withOpacity(0.3)),
                      const SizedBox(height: 16),
                      Text('No tenants found',
                          style: GoogleFonts.outfit(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 8),
                      Text('Start by onboarding your first business account.',
                          style: GoogleFonts.inter(
                              color: AppColors.textSecondary)),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => _showTenantModal(),
                        style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12))),
                        child: Text('Add New Tenant',
                            style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontWeight: FontWeight.bold)),
                      )
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: _tenants.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final t = _tenants[index];
                    final isActive = t['isActive'] ?? false;
                    final webhooksEnabled = t['webhooksEnabled'] ?? false;

                    return Container(
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.cardBorder),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 10,
                              offset: const Offset(0, 4)),
                        ],
                      ),
                      child: Opacity(
                        opacity: isActive ? 1.0 : 0.6,
                        child: Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF6366F1)
                                          .withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.business,
                                        color: Color(0xFF6366F1)),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(t['name'] ?? 'Unknown',
                                            style: GoogleFonts.outfit(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.textPrimary)),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: isActive
                                                    ? const Color(0xFF10B981)
                                                        .withOpacity(0.1)
                                                    : const Color(0xFFF59E0B)
                                                        .withOpacity(0.1),
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                isActive
                                                    ? 'ACTIVE'
                                                    : 'DISABLED',
                                                style: GoogleFonts.inter(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: isActive
                                                        ? const Color(
                                                            0xFF10B981)
                                                        : const Color(
                                                            0xFFF59E0B)),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text('ID: #${t['id']}',
                                                style: GoogleFonts.inter(
                                                    fontSize: 12,
                                                    color:
                                                        AppColors.textMuted)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit,
                                            size: 20,
                                            color: AppColors.textSecondary),
                                        onPressed: () =>
                                            _showTenantModal(tenant: t),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline,
                                            size: 20, color: Colors.redAccent),
                                        onPressed: () => _deleteTenant(t['id']),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1, color: AppColors.border),
                            Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text('PHONE ID',
                                            style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.textMuted)),
                                        const SizedBox(height: 4),
                                        Text(
                                            t['phoneNumberId']
                                                        ?.toString()
                                                        .isNotEmpty ==
                                                    true
                                                ? t['phoneNumberId']
                                                : '—',
                                            style: GoogleFonts.inter(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.textPrimary),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text('WABA ID',
                                            style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.textMuted)),
                                        const SizedBox(height: 4),
                                        Text(
                                            t['wabaId']
                                                        ?.toString()
                                                        .isNotEmpty ==
                                                    true
                                                ? t['wabaId']
                                                : '—',
                                            style: GoogleFonts.inter(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.textPrimary),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (isActive && t['wabaId'] != null)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 20, vertical: 16),
                                decoration: const BoxDecoration(
                                  color: AppColors.inputBg,
                                  borderRadius: BorderRadius.vertical(
                                      bottom: Radius.circular(16)),
                                ),
                                child: webhooksEnabled
                                    ? Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.check_circle,
                                              color: Color(0xFF10B981),
                                              size: 16),
                                          const SizedBox(width: 8),
                                          Text('Webhooks Subscribed',
                                              style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w600,
                                                  color:
                                                      const Color(0xFF10B981))),
                                        ],
                                      )
                                    : SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton.icon(
                                          onPressed: () =>
                                              _enableWebhooks(t['id']),
                                          style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  const Color(0xFF10B981),
                                              elevation: 0),
                                          icon: const Icon(Icons.language,
                                              color: Colors.white, size: 16),
                                          label: Text('Enable Meta Webhooks',
                                              style: GoogleFonts.outfit(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold)),
                                        ),
                                      ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
