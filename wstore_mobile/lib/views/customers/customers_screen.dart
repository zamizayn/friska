import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/customers_provider.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _searchController = TextEditingController();
  final List<String> _selectedPhones = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CustomersProvider>().fetchCustomers();
    });
  }

  void _onSearchChanged(String query) {
    context.read<CustomersProvider>().fetchCustomers(search: query);
  }

  void _toggleSelectCustomer(String phone) {
    setState(() {
      if (_selectedPhones.contains(phone)) {
        _selectedPhones.remove(phone);
      } else {
        _selectedPhones.add(phone);
      }
    });
  }

  void _toggleSelectAll(List<dynamic> customers) {
    setState(() {
      if (_selectedPhones.length == customers.length) {
        _selectedPhones.clear();
      } else {
        _selectedPhones.clear();
        for (var c in customers) {
          final phone = c['phone']?.toString();
          if (phone != null) {
            _selectedPhones.add(phone);
          }
        }
      }
    });
  }

  void _showBroadcastCampaignSheet() {
    final msgController = TextEditingController();
    bool isSending = false;
    String error = "";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> submit() async {
              if (msgController.text.trim().isEmpty) {
                setSheetState(() => error = "Please write a campaign message");
                return;
              }

              setSheetState(() {
                isSending = true;
                error = "";
              });

              final success = await context.read<CustomersProvider>().sendBroadcast(
                    message: msgController.text.trim(),
                    targetPhoneNumbers: _selectedPhones,
                  );

              if (success && mounted) {
                Navigator.pop(context);
                setState(() => _selectedPhones.clear());
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('WhatsApp Broadcast Campaign dispatched!'), backgroundColor: Color(0xFF10B981)),
                );
              } else {
                setSheetState(() {
                  isSending = false;
                  error = "Broadcast dispatch failed. Verify settings.";
                });
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 24.0,
                right: 24.0,
                top: 24.0,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24.0,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'WhatsApp Broadcast',
                        style: GoogleFonts.outfit(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF6366F1).withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
                        child: Text(
                          '${_selectedPhones.length} Selected',
                          style: GoogleFonts.outfit(color: const Color(0xFF818CF8), fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: msgController,
                    maxLines: 4,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Type your promotional coupon details, discount updates here...',
                      hintStyle: const TextStyle(color: AppColors.textPrimary24),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  if (error.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(error, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                  ],
                  const SizedBox(height: 20),
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: const LinearGradient(colors: [Color(0xFF25D366), Color(0xFF128C7E)]),
                    ),
                    child: ElevatedButton(
                      onPressed: isSending ? null : submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: isSending
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                          : Text('Shoot Broadcast Campaign 🚀', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CustomersProvider>();
    final list = provider.customers;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Customers Directory', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (list.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.select_all, color: AppColors.textPrimary),
              onPressed: () => _toggleSelectAll(list),
            ),
        ],
      ),
      bottomNavigationBar: _selectedPhones.isNotEmpty
          ? Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.textPrimary10)),
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFA855F7)]),
                ),
                child: ElevatedButton(
                  onPressed: _showBroadcastCampaignSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    'Setup WhatsApp Broadcast (${_selectedPhones.length})',
                    style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search customer name or phone...',
                  hintStyle: GoogleFonts.inter(color: const Color(0xFF475569)),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF6366F1), size: 20),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))),
                  )
                : list.isEmpty
                    ? Center(
                        child: Text(
                          'No customer logs recorded',
                          style: GoogleFonts.inter(color: const Color(0xFF475569)),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: list.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final customer = list[index];
                          final id = customer['id'] ?? 0;
                          final name = customer['name'] ?? 'Guest Customer';
                          final phone = customer['phone']?.toString() ?? 'N/A';
                          final email = customer['email'] ?? 'N/A';
                          final isSelected = _selectedPhones.contains(phone);

                          return Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            decoration: BoxDecoration(
                              color: AppColors.cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: ListTile(
                              leading: Checkbox(
                                activeColor: const Color(0xFF6366F1),
                                checkColor: Colors.white,
                                value: isSelected,
                                onChanged: (_) => _toggleSelectCustomer(phone),
                              ),
                              title: Text(
                                name,
                                style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('Phone: $phone', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                  Text('Email: $email', style: const TextStyle(color: Color(0xFF475569), fontSize: 11)),
                                ],
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 22),
                                onPressed: () async {
                                  final success = await provider.deleteCustomer(id);
                                  if (success && mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Customer profile deleted'), backgroundColor: Color(0xFF10B981)),
                                    );
                                  }
                                },
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}