import 'dart:io';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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

              final success =
                  await context.read<CategoriesProvider>().saveCategory(
                        id: category?['id'],
                        name: nameController.text.trim(),
                        priority: priorityController.text.trim(),
                        imageFile: selectedImage,
                      );

              if (success && mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isEdit
                        ? 'Category modified successfully!'
                        : 'Category added successfully!'),
                    backgroundColor: const Color(0xFF10B981),
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
                style: GoogleFonts.outfit(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 18),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Category Image selector
                    GestureDetector(
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: const Color(0xFF090D1A),
                          builder: (context) => Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                ListTile(
                                  leading: const Icon(Icons.camera_alt,
                                      color: Color(0xFF6366F1)),
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
                                      color: Color(0xFFA855F7)),
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
                                        color: Color(0xFF6366F1), size: 28),
                                  ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameController,
                      style: GoogleFonts.inter(
                          color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Category Name',
                        hintStyle:
                            GoogleFonts.inter(color: AppColors.textMuted),
                        filled: true,
                        fillColor: AppColors.inputBg,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                const BorderSide(color: AppColors.border)),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                const BorderSide(color: AppColors.border)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: priorityController,
                      keyboardType: TextInputType.number,
                      style: GoogleFonts.inter(
                          color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Priority Rank (1, 2, ...)',
                        hintStyle:
                            GoogleFonts.inter(color: AppColors.textMuted),
                        filled: true,
                        fillColor: AppColors.inputBg,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                const BorderSide(color: AppColors.border)),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                const BorderSide(color: AppColors.border)),
                      ),
                    ),
                    if (error.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(error,
                          style: const TextStyle(
                              color: Colors.redAccent, fontSize: 12)),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel',
                      style: TextStyle(color: AppColors.textPrimary54)),
                ),
                TextButton(
                  onPressed: isSaving ? null : submit,
                  child: isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white)))
                      : const Text('Save',
                          style: TextStyle(
                              color: Color(0xFF6366F1),
                              fontWeight: FontWeight.bold)),
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
    final provider = context.watch<CategoriesProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Categories Manager',
            style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: AppColors.textPrimary),
        onPressed: () => _showAddCategoryDialog(),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))),
            )
          : provider.categories.isEmpty
              ? Center(
                  child: Text(
                    'No categories established yet',
                    style: GoogleFonts.inter(color: const Color(0xFF475569)),
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
                    final imageUrl = cat['imageUrl'] ?? '';

                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: imageUrl.isNotEmpty
                                ? Image.network(imageUrl,
                                    width: 50,
                                    height: 50,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                        Icons.category,
                                        color: AppColors.textPrimary24))
                                : const Icon(Icons.category,
                                    color: AppColors.textPrimary24, size: 30),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: GoogleFonts.outfit(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Priority Rank: $priority',
                                  style: GoogleFonts.inter(
                                      color: const Color(0xFF64748B),
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
                                color: Color(0xFFEF4444), size: 20),
                            onPressed: () async {
                              final success = await provider.deleteCategory(id);
                              if (success && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content:
                                          Text('Category deleted successfully'),
                                      backgroundColor: Color(0xFF10B981)),
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
