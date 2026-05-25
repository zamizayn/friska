import 'dart:io';
import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/categories_provider.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CategoriesProvider>().fetchCategories();
    });
  }

  void _showAddCategoryDialog({Map<String, dynamic>? category}) {
    final isEdit = category != null;
    final nameController =
        TextEditingController(text: isEdit ? category['name'] : '');
    final priorityController = TextEditingController(
        text: isEdit ? category['priority']?.toString() : '1');
    final gstRateController = TextEditingController(
        text: isEdit ? (category['gstRate']?.toString() ?? '0') : '0');
    File? selectedImage;
    bool isSaving = false;
    String error = "";

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> pickImage(ImageSource source) async {
              try {
                final picked = await _picker.pickImage(source: source);
                if (picked != null) {
                  setDialogState(() {
                    selectedImage = File(picked.path);
                  });
                }
              } catch (_) {}
            }

            Future<void> submit() async {
              if (nameController.text.trim().isEmpty ||
                  priorityController.text.trim().isEmpty) {
                setDialogState(
                    () => error = "Please fill all category details");
                return;
              }

              setDialogState(() {
                isSaving = true;
                error = "";
              });

              final gstRate =
                  double.tryParse(gstRateController.text.trim()) ?? 0;
              final success =
                  await context.read<CategoriesProvider>().saveCategory(
                        id: category?['id'],
                        name: nameController.text.trim(),
                        priority: priorityController.text.trim(),
                        gstRate: gstRate,
                        imageFile: selectedImage,
                      );

              if (success && mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isEdit
                        ? 'Category modified successfully!'
                        : 'Category added successfully!'),
                    backgroundColor: AppColors.green,
                  ),
                );
              } else {
                setDialogState(() {
                  isSaving = false;
                  error = "Failed to save category. Try again.";
                });
              }
            }

            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: Text(
                isEdit ? 'Modify Category' : 'Create Category',
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
                    GestureDetector(
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: AppColors.background,
                          builder: (context) => Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                ListTile(
                                  leading: const Icon(Icons.camera_alt,
                                      color: AppColors.accent),
                                  title: const Text('Camera',
                                      style: TextStyle(
                                          color: AppColors.textPrimary)),
                                  onTap: () {
                                    Navigator.pop(context);
                                    pickImage(ImageSource.camera);
                                  },
                                ),
                                ListTile(
                                  leading: const Icon(Icons.photo,
                                      color: AppColors.accentLight),
                                  title: const Text('Gallery',
                                      style: TextStyle(
                                          color: AppColors.textPrimary)),
                                  onTap: () {
                                    Navigator.pop(context);
                                    pickImage(ImageSource.gallery);
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      child: Container(
                        height: 100,
                        decoration: BoxDecoration(
                          color: AppColors.cardBg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: selectedImage != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: Image.file(selectedImage!,
                                    fit: BoxFit.cover),
                              )
                            : (isEdit && category['imageUrl'] != null)
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: Image.network(category['imageUrl'],
                                        fit: BoxFit.cover),
                                  )
                                : const Center(
                                    child: Icon(Icons.add_photo_alternate,
                                        color: AppColors.accent, size: 28),
                                  ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    GlassInput(
                      controller: nameController,
                      hint: 'Category Name',
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: priorityController,
                      hint: 'Priority Rank (1, 2, ...)',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    GlassInput(
                      controller: gstRateController,
                      hint: 'GST Rate % (e.g. 18)',
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                    ),
                    if (error.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(error,
                          style: const TextStyle(
                              color: Colors.redAccent, fontSize: 12)),
                    ],
                    const SizedBox(height: 16),
                    GlassButton(
                      label: isEdit ? 'Modify Category' : 'Create Category',
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
    final provider = context.watch<CategoriesProvider>();

    return GlassScaffold(
      title: 'Categories Manager',
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        child: const Icon(Icons.add, color: AppColors.textPrimary),
        onPressed: () => _showAddCategoryDialog(),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.accent)),
            )
          : provider.categories.isEmpty
              ? Center(
                  child: Text(
                    'No categories established yet',
                    style: TextStyle(
                        fontFamily: 'Inter', color: AppColors.textMuted),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: provider.categories.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final cat = provider.categories[index];
                    final id = cat['id'] ?? 0;
                    final name = cat['name'] ?? 'Category';
                    final priority = cat['priority'] ?? 1;
                    final gstRate = cat['gstRate'] ?? 0;
                    final imageUrl = cat['imageUrl'] ?? '';

                    return GlassCard(
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: imageUrl.isNotEmpty
                                ? Image.network(imageUrl,
                                    width: 50,
                                    height: 50,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        const Icon(Icons.category,
                                            color: AppColors.textPrimary24))
                                : const Icon(Icons.category,
                                    color: AppColors.textPrimary24,
                                    size: 30),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: TextStyle(
                                      fontFamily: 'Outfit',
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Priority Rank: $priority${gstRate > 0 ? '  |  GST: ${gstRate}%' : ''}',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      color: AppColors.textMuted,
                                      fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit,
                                color: AppColors.textPrimary54, size: 20),
                            onPressed: () =>
                                _showAddCategoryDialog(category: cat),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete,
                                color: AppColors.red, size: 20),
                            onPressed: () async {
                              final success =
                                  await provider.deleteCategory(id);
                              if (success && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Category deleted successfully'),
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
