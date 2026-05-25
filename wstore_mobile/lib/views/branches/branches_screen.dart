import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import '../../providers/branches_provider.dart';

class BranchesScreen extends StatefulWidget {
  const BranchesScreen({super.key});

  @override
  State<BranchesScreen> createState() => _BranchesScreenState();
}

class _BranchesScreenState extends State<BranchesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BranchesProvider>().fetchBranches();
    });
  }

  void _showBranchForm({Map<String, dynamic>? branch}) {
    final isEdit = branch != null;
    final nameCtrl = TextEditingController(text: branch?['name'] ?? '');
    final usernameCtrl =
        TextEditingController(text: branch?['username'] ?? '');
    final passwordCtrl = TextEditingController();
    final addressCtrl =
        TextEditingController(text: branch?['address'] ?? '');
    final latCtrl =
        TextEditingController(text: branch?['latitude']?.toString() ?? '');
    final lonCtrl =
        TextEditingController(text: branch?['longitude']?.toString() ?? '');
    final radiusCtrl = TextEditingController(
        text: branch?['deliveryRadius']?.toString() ?? '');
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20)),
          title: Text(
            isEdit ? 'Edit Branch' : 'New Branch',
            style: TextStyle(
                fontFamily: 'Outfit',
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GlassInput(
                    controller: nameCtrl,
                    hint: 'Name',
                  ),
                  const SizedBox(height: 12),
                  GlassInput(
                    controller: usernameCtrl,
                    hint: 'Username',
                  ),
                  const SizedBox(height: 12),
                  if (!isEdit)
                    GlassInput(
                      controller: passwordCtrl,
                      hint: 'Password',
                      obscure: true,
                    ),
                  if (!isEdit) const SizedBox(height: 12),
                  GlassInput(
                    controller: addressCtrl,
                    hint: 'Address',
                  ),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: GlassInput(
                        controller: latCtrl,
                        hint: 'Latitude',
                        keyboardType:
                            TextInputType.numberWithOptions(decimal: true),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GlassInput(
                        controller: lonCtrl,
                        hint: 'Longitude',
                        keyboardType:
                            TextInputType.numberWithOptions(decimal: true),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  GlassInput(
                    controller: radiusCtrl,
                    hint: 'Delivery Radius (km)',
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  GlassButton(
                    label: isEdit ? 'Update' : 'Create',
                    onPressed: saving
                        ? null
                        : () async {
                            setDState(() => saving = true);
                            final data = {
                              'name': nameCtrl.text,
                              'username': usernameCtrl.text,
                              'address': addressCtrl.text,
                              'latitude': double.tryParse(latCtrl.text),
                              'longitude': double.tryParse(lonCtrl.text),
                              'deliveryRadius':
                                  double.tryParse(radiusCtrl.text),
                            };
                            if (!isEdit) {
                              data['password'] = passwordCtrl.text;
                            }
                            bool success;
                            if (isEdit) {
                              success = await context
                                  .read<BranchesProvider>()
                                      .updateBranch(
                                          branch['id'], data);
                            } else {
                              success = await context
                                  .read<BranchesProvider>()
                                  .createBranch(data);
                            }
                            if (ctx.mounted) Navigator.pop(ctx);
                            if (success && mounted) {
                              ScaffoldMessenger.of(context)
                                  .showSnackBar(SnackBar(
                                content: Text(isEdit
                                    ? 'Branch updated'
                                    : 'Branch created'),
                                backgroundColor: AppColors.green,
                              ));
                            }
                          },
                    isLoading: saving,
                  ),
                ]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BranchesProvider>();
    return GlassScaffold(
      title: 'Branches',
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        child: const Icon(Icons.add),
        onPressed: () => _showBranchForm(),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.accent)))
          : provider.branches.isEmpty
              ? Center(
                  child: Text('No branches yet',
                      style: TextStyle(
                          fontFamily: 'Inter',
                          color: AppColors.textMuted)))
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: provider.branches.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final b = provider.branches[i];
                    return GlassCard(
                      child: Row(children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.business,
                              color: AppColors.accent),
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
                                b['address'] ?? 'No address',
                                style: TextStyle(
                                    fontFamily: 'Inter',
                                    color: AppColors.textMuted,
                                    fontSize: 12),
                              ),
                            ])),
                        PopupMenuButton<String>(
                          color: AppColors.surface,
                          onSelected: (v) {
                            if (v == 'edit') {
                              _showBranchForm(branch: b);
                            }
                            if (v == 'delete') {
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  backgroundColor: AppColors.surface,
                                  title:
                                      const Text('Delete branch?'),
                                  actions: [
                                    TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx),
                                        child:
                                            const Text('Cancel')),
                                    TextButton(
                                      onPressed: () async {
                                        final s = await context
                                            .read<
                                                BranchesProvider>()
                                            .deleteBranch(b['id']);
                                        if (ctx.mounted) {
                                          Navigator.pop(ctx);
                                        }
                                        if (s && mounted) {
                                          ScaffoldMessenger.of(
                                                  context)
                                              .showSnackBar(
                                                  const SnackBar(
                                                      content: Text(
                                                          'Branch deleted')));
                                        }
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
