import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
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
    final startDateController = TextEditingController(text: isEdit ? offer['startDate']?.toString().split('T')[0] : '');
    final minOrderController = TextEditingController(text: isEdit ? offer['minOrderAmount']?.toString() : '');
    final maxDiscountController = TextEditingController(text: isEdit ? offer['maxDiscount']?.toString() : '');
    final usageLimitController = TextEditingController(text: isEdit ? offer['usageLimit']?.toString() : '');

    String type = isEdit ? offer['type'] ?? 'percentage' : 'percentage';
    String usageType = isEdit ? (offer['usageType'] ?? 'unlimited') : 'unlimited';
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
              if (codeController.text.trim().isEmpty ||
                  valueController.text.trim().isEmpty ||
                  dateController.text.trim().isEmpty) {
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
                    minOrderAmount: double.tryParse(minOrderController.text.trim()),
                    maxDiscount: double.tryParse(maxDiscountController.text.trim()),
                    usageLimit: int.tryParse(usageLimitController.text.trim()),
                    usageType: usageType,
                    startDate: startDateController.text.trim().isEmpty
                        ? null
                        : startDateController.text.trim(),
                  );

              if (success && mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isEdit ? 'Promo Offer modified!' : 'Promo Offer added!'),
                    backgroundColor: AppColors.green,
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
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: Text(
                isEdit ? 'Modify Offer' : 'Create Offer',
                style: TextStyle(
                    fontFamily: 'Outfit',
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 18),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GlassInput(
                      controller: codeController,
                      hint: 'PROMO CODE (e.g. SAVE20)',
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: GlassChip(
                            label: '% Ratio',
                            selected: type == 'percentage',
                            onTap: () =>
                                setDialogState(() => type = 'percentage'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: GlassChip(
                            label: 'Flat ₹',
                            selected: type == 'fixed',
                            onTap: () =>
                                setDialogState(() => type = 'fixed'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: valueController,
                      hint: 'Discount Value',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: startDateController,
                      hint: 'Start Date (YYYY-MM-DD, optional)',
                      keyboardType: TextInputType.datetime,
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: dateController,
                      hint: 'Expiry Date (YYYY-MM-DD)',
                      keyboardType: TextInputType.datetime,
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: minOrderController,
                      hint: 'Min Order Amount (optional)',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: maxDiscountController,
                      hint: 'Max Discount Cap (optional)',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: usageLimitController,
                      hint: 'Usage Limit (optional)',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: GlassChip(
                            label: 'Unlimited',
                            selected: usageType == 'unlimited',
                            onTap: () =>
                                setDialogState(() => usageType = 'unlimited'),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: GlassChip(
                            label: 'Per User',
                            selected: usageType == 'per_user',
                            onTap: () =>
                                setDialogState(() => usageType = 'per_user'),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: GlassChip(
                            label: 'Total',
                            selected: usageType == 'total',
                            onTap: () =>
                                setDialogState(() => usageType = 'total'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Active Status',
                            style: TextStyle(color: AppColors.textPrimary)),
                        Switch(
                          value: isActive,
                          activeColor: AppColors.green,
                          onChanged: (val) =>
                              setDialogState(() => isActive = val),
                        ),
                      ],
                    ),
                    if (error.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(error,
                          style: const TextStyle(
                              color: Colors.redAccent, fontSize: 12)),
                    ],
                    const SizedBox(height: 16),
                    GlassButton(
                      label: isEdit ? 'Modify Offer' : 'Create Offer',
                      onPressed: isSaving ? null : submit,
                      isLoading: isSaving,
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OffersProvider>();

    return GlassScaffold(
      title: 'Offers & Promo Coupons',
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        child: const Icon(Icons.add, color: AppColors.textPrimary),
        onPressed: () => _showAddOfferDialog(),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.accent)),
            )
          : provider.errorMessage.isNotEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            color: AppColors.amber, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          provider.errorMessage,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontFamily: 'Inter',
                              color: AppColors.red,
                              fontSize: 14),
                        ),
                        const SizedBox(height: 16),
                        GlassButton(
                          label: 'Retry',
                          icon: Icons.refresh,
                          onPressed: () => context
                              .read<OffersProvider>()
                              .fetchOffers(),
                        ),
                      ],
                    ),
                  ),
                )
              : provider.offers.isEmpty
                  ? Center(
                      child: Text(
                        'No promo coupons active',
                        style: TextStyle(
                            fontFamily: 'Inter', color: AppColors.textMuted),
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
                    final expiry =
                        offer['expiryDate']?.toString().split('T')[0] ?? 'N/A';
                    final active = offer['active'] == true;
                    final minOrder = offer['minOrderAmount'];
                    final maxDisc = offer['maxDiscount'];
                    final usageLimit = offer['usageLimit'];
                    final usageType = offer['usageType'];
                    final startDate =
                        offer['startDate']?.toString().split('T')[0];

                    return GlassCard(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: active
                                  ? AppColors.green.withOpacity(0.1)
                                  : AppColors.red.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.local_offer,
                                color:
                                    active ? AppColors.green : AppColors.red,
                                size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  code,
                                  style: TextStyle(
                                      fontFamily: 'Outfit',
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  type == 'percentage'
                                      ? '$val% ratio discount'
                                      : '₹$val flat discount',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      color: AppColors.accent,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold),
                                ),
                                if (minOrder != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    'Min Order: ₹${minOrder.toStringAsFixed(0)}',
                                    style: TextStyle(
                                        fontFamily: 'Inter',
                                        color: AppColors.textMuted,
                                        fontSize: 11),
                                  ),
                                ],
                                if (maxDisc != null && type == 'percentage') ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    'Max Discount: ₹${maxDisc.toStringAsFixed(0)}',
                                    style: TextStyle(
                                        fontFamily: 'Inter',
                                        color: AppColors.textMuted,
                                        fontSize: 11),
                                  ),
                                ],
                                if (usageType != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    'Usage: $usageType${usageLimit != null ? ' (limit: $usageLimit)' : ''}',
                                    style: TextStyle(
                                        fontFamily: 'Inter',
                                        color: AppColors.textMuted,
                                        fontSize: 11),
                                  ),
                                ],
                                const SizedBox(height: 4),
                                Text(
                                  '${startDate != null ? '$startDate → ' : ''}Expires: $expiry',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      color: AppColors.textMuted,
                                      fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit,
                                color: AppColors.textPrimary54, size: 20),
                            onPressed: () =>
                                _showAddOfferDialog(offer: offer),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete,
                                color: AppColors.red, size: 20),
                            onPressed: () async {
                              final success =
                                  await provider.deleteOffer(id);
                              if (success && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Offer coupon deleted successfully'),
                                      backgroundColor: AppColors.green),
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
