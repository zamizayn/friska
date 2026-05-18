import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/offers_provider.dart';

class OffersScreen extends StatefulWidget {
  const OffersScreen({super.key});

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OffersProvider>().fetchOffers();
    });
  }

  void _showAddOfferDialog({Map<String, dynamic>? offer}) {
    final isEdit = offer != null;
    final codeController = TextEditingController(text: isEdit ? offer['code'] : '');
    final valueController = TextEditingController(text: isEdit ? offer['value']?.toString() : '');
    final dateController = TextEditingController(text: isEdit ? offer['expiryDate']?.toString().split('T')[0] : '');
    
    String type = isEdit ? offer['type'] ?? 'percentage' : 'percentage';
    bool isActive = isEdit ? offer['active'] == true : true;
    bool isSaving = false;
    String error = "";

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> submit() async {
              if (codeController.text.trim().isEmpty || valueController.text.trim().isEmpty || dateController.text.trim().isEmpty) {
                setDialogState(() => error = "Please fill all promotional offer fields");
                return;
              }
              final valDouble = double.tryParse(valueController.text.trim());
              if (valDouble == null) {
                setDialogState(() => error = "Please write a numeric value");
                return;
              }

              setDialogState(() {
                isSaving = true;
                error = "";
              });

              final success = await context.read<OffersProvider>().saveOffer(
                    id: offer?['id'],
                    code: codeController.text.trim().toUpperCase(),
                    type: type,
                    value: valDouble,
                    expiryDate: dateController.text.trim(),
                    active: isActive,
                  );

              if (success && mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isEdit ? 'Promo Offer modified!' : 'Promo Offer added!'),
                    backgroundColor: const Color(0xFF10B981),
                  ),
                );
              } else {
                setDialogState(() {
                  isSaving = false;
                  error = "Failed to save promo details. Try again.";
                });
              }
            }

            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text(
                isEdit ? 'Modify Offer' : 'Create Offer',
                style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: codeController,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'PROMO CODE (e.g. SAVE20)',
                        hintStyle: const TextStyle(color: AppColors.textPrimary24),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setDialogState(() => type = 'percentage'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: type == 'percentage' ? const Color(0xFF6366F1).withOpacity(0.12) : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: type == 'percentage' ? const Color(0xFF6366F1) : Colors.white10),
                              ),
                              child: const Text('% Ratio', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setDialogState(() => type = 'fixed'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: type == 'fixed' ? const Color(0xFF6366F1).withOpacity(0.12) : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: type == 'fixed' ? const Color(0xFF6366F1) : Colors.white10),
                              ),
                              child: const Text('Flat ₹', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: valueController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Discount Value',
                        hintStyle: const TextStyle(color: AppColors.textPrimary24),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: dateController,
                      keyboardType: TextInputType.datetime,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Expiry Date (YYYY-MM-DD)',
                        hintStyle: const TextStyle(color: AppColors.textPrimary24),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Active Status', style: TextStyle(color: AppColors.textPrimary)),
                        Switch(
                          value: isActive,
                          activeColor: const Color(0xFF10B981),
                          onChanged: (val) => setDialogState(() => isActive = val),
                        ),
                      ],
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
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                      : const Text('Save', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OffersProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Offers & Promo Coupons', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: AppColors.textPrimary),
        onPressed: () => _showAddOfferDialog(),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))),
            )
          : provider.offers.isEmpty
              ? Center(
                  child: Text(
                    'No promo coupons active',
                    style: GoogleFonts.inter(color: const Color(0xFF475569)),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: provider.offers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final offer = provider.offers[index];
                    final id = offer['id'] ?? 0;
                    final code = offer['code'] ?? 'COUPON';
                    final type = offer['type'] ?? 'percentage';
                    final val = offer['value'] ?? 0;
                    final expiry = offer['expiryDate']?.toString().split('T')[0] ?? 'N/A';
                    final active = offer['active'] == true;

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: active ? const Color(0xFF10B981).withOpacity(0.1) : const Color(0xFFEF4444).withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.local_offer, color: active ? const Color(0xFF10B981) : const Color(0xFFEF4444), size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  code,
                                  style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  type == 'percentage' ? '$val% ratio discount' : '₹$val flat discount',
                                  style: GoogleFonts.inter(color: const Color(0xFF6366F1), fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Expires: $expiry',
                                  style: GoogleFonts.inter(color: const Color(0xFF475569), fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit, color: AppColors.textPrimary54, size: 20),
                            onPressed: () => _showAddOfferDialog(offer: offer),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Color(0xFFEF4444), size: 20),
                            onPressed: () async {
                              final success = await provider.deleteOffer(id);
                              if (success && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Offer coupon deleted successfully'), backgroundColor: Color(0xFF10B981)),
                                );
                              }
                            },
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}