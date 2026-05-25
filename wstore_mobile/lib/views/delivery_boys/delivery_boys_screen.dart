import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import '../../providers/delivery_boys_provider.dart';

class DeliveryBoysScreen extends StatefulWidget {
  const DeliveryBoysScreen({super.key});

  @override
  State<DeliveryBoysScreen> createState() => _DeliveryBoysScreenState();
}

class _DeliveryBoysScreenState extends State<DeliveryBoysScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DeliveryBoysProvider>().fetchDeliveryBoys();
    });
  }

  void _showAssignOrder(int boyId, String boyName) {
    final provider = context.read<DeliveryBoysProvider>();
    provider.fetchAvailableOrders();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDState) => AlertDialog(
            backgroundColor: AppColors.surface,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20)),
            title: Text(
              'Assign Order to $boyName',
              style: const TextStyle(
                  fontFamily: 'Outfit',
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold),
            ),
            content: SizedBox(
              width: double.maxFinite,
              child: ListenableBuilder(
                listenable: provider,
                builder: (context, _) {
                  final orders = provider.availableOrders;
                  if (provider.isLoading) {
                    return const SizedBox(
                      height: 100,
                      child: Center(
                          child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  AppColors.accent))),
                    );
                  }
                  if (orders.isEmpty) {
                    return const SizedBox(
                      height: 100,
                      child: Center(
                        child: Text('No available orders',
                            style: TextStyle(color: AppColors.textMuted)),
                      ),
                    );
                  }
                  return SizedBox(
                    height: 300,
                    child: ListView.separated(
                      itemCount: orders.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 8),
                      itemBuilder: (_, i) {
                        final o = orders[i];
                        return GlassCard(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '#${o['id']} - ${o['customerName'] ?? 'N/A'}',
                                      style: const TextStyle(
                                          fontFamily: 'Outfit',
                                          color: AppColors.textPrimary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '₹${o['total'] ?? 0} • ${o['status'] ?? 'pending'}',
                                      style: const TextStyle(
                                          fontFamily: 'Inter',
                                          color: AppColors.textMuted,
                                          fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              GlassButton(
                                label: 'Assign',
                                onPressed: () async {
                                  final success = await provider
                                      .assignDeliveryBoy(
                                          o['id'], boyId);
                                  if (success && mounted) {
                                    Navigator.pop(ctx);
                                    ScaffoldMessenger.of(context)
                                        .showSnackBar(const SnackBar(
                                      content: Text(
                                          'Order assigned to delivery partner'),
                                      backgroundColor: AppColors.green,
                                    ));
                                  } else if (mounted) {
                                    ScaffoldMessenger.of(context)
                                        .showSnackBar(const SnackBar(
                                      content: Text('Assignment failed'),
                                      backgroundColor: AppColors.red,
                                    ));
                                  }
                                },
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showForm({Map<String, dynamic>? boy}) {
    final isEdit = boy != null;
    final nameCtrl = TextEditingController(text: boy?['name'] ?? '');
    final phoneCtrl = TextEditingController(text: boy?['phone'] ?? '');
    final passCtrl = TextEditingController();
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20)),
          title: Text(
            isEdit ? 'Edit Delivery Boy' : 'Add Delivery Boy',
            style: TextStyle(
                fontFamily: 'Outfit',
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold),
          ),
          content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GlassInput(
                  controller: nameCtrl,
                  hint: 'Name',
                ),
                const SizedBox(height: 12),
                GlassInput(
                  controller: phoneCtrl,
                  hint: 'Phone',
                  keyboardType: TextInputType.phone,
                ),
                if (!isEdit) ...[
                  const SizedBox(height: 12),
                  GlassInput(
                    controller: passCtrl,
                    hint: 'Password',
                    obscure: true,
                  ),
                ],
                const SizedBox(height: 16),
                GlassButton(
                  label: isEdit ? 'Update' : 'Add',
                  onPressed: saving
                      ? null
                      : () async {
                          setDState(() => saving = true);
                          bool success;
                          if (isEdit) {
                            success = await context
                                .read<DeliveryBoysProvider>()
                                .updateDeliveryBoy(boy['id'],
                                    name: nameCtrl.text,
                                    phone: phoneCtrl.text);
                          } else {
                            success = await context
                                .read<DeliveryBoysProvider>()
                                .createDeliveryBoy(
                                    name: nameCtrl.text,
                                    phone: phoneCtrl.text,
                                    password: passCtrl.text);
                          }
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (success && mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(isEdit
                                      ? 'Delivery boy updated'
                                      : 'Delivery boy added'),
                                  backgroundColor: AppColors.green,
                                ));
                          }
                        },
                  isLoading: saving,
                ),
              ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DeliveryBoysProvider>();
    return GlassScaffold(
      title: 'Delivery Boys',
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        child: const Icon(Icons.person_add),
        onPressed: () => _showForm(),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.accent)))
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
                              .read<DeliveryBoysProvider>()
                              .fetchDeliveryBoys(),
                        ),
                      ],
                    ),
                  ),
                )
              : provider.deliveryBoys.isEmpty
                  ? Center(
                      child: Text('No delivery boys',
                          style: TextStyle(
                              fontFamily: 'Inter',
                              color: AppColors.textMuted)))
                  : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: provider.deliveryBoys.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final b = provider.deliveryBoys[i];
                    final active = b['status'] == 'active';
                    return GlassCard(
                      child: Row(children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: active
                                ? AppColors.green.withOpacity(0.1)
                                : AppColors.cardOpacityBg,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.person,
                              color: active
                                  ? AppColors.green
                                  : AppColors.textMuted),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                            child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                              Text(
                                b['name'] ?? '',
                                style: TextStyle(
                                    fontFamily: 'Outfit',
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                b['phone'] ?? '',
                                style: TextStyle(
                                    fontFamily: 'Inter',
                                    color: AppColors.textMuted,
                                    fontSize: 12),
                              ),
                            ])),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: active
                                ? AppColors.green.withOpacity(0.1)
                                : AppColors.cardOpacityBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            active ? 'Active' : 'Inactive',
                            style: TextStyle(
                                fontFamily: 'Outfit',
                                color: active
                                    ? AppColors.green
                                    : AppColors.textMuted,
                                fontSize: 11,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                        PopupMenuButton<String>(
                          color: AppColors.surface,
                          onSelected: (v) {
                            if (v == 'edit') _showForm(boy: b);
                            if (v == 'toggle') {
                              context
                                  .read<DeliveryBoysProvider>()
                                  .updateDeliveryBoy(b['id'],
                                      status: active
                                          ? 'inactive'
                                          : 'active');
                            }
                            if (v == 'assign') {
                              _showAssignOrder(
                                  b['id'], b['name'] ?? '');
                            }
                            if (v == 'delete') {
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  backgroundColor: AppColors.surface,
                                  title:
                                      const Text('Delete delivery boy?'),
                                  actions: [
                                    TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx),
                                        child:
                                            const Text('Cancel')),
                                    TextButton(
                                      onPressed: () async {
                                        await context
                                            .read<
                                                DeliveryBoysProvider>()
                                            .deleteDeliveryBoy(
                                                b['id']);
                                        if (ctx.mounted)
                                          Navigator.pop(ctx);
                                      },
                                      child: const Text('Delete',
                                          style: TextStyle(
                                              color:
                                                  Colors.redAccent)),
                                    ),
                                  ],
                                ),
                              );
                            }
                          },
                          itemBuilder: (_) => [
                            const PopupMenuItem(
                                value: 'edit', child: Text('Edit')),
                            PopupMenuItem(
                                value: 'toggle',
                                child: Text(
                                    active ? 'Deactivate' : 'Activate')),
                            const PopupMenuItem(
                                value: 'assign',
                                child: Text('Assign Order')),
                            const PopupMenuItem(
                                value: 'delete',
                                child: Text('Delete',
                                    style:
                                        TextStyle(color: Colors.redAccent))),
                          ],
                        ),
                      ]),
                    );
                  },
                ),
    );
  }
}
