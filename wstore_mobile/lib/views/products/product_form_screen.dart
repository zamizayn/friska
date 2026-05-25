import 'dart:io';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/products_provider.dart';
import '../../providers/categories_provider.dart';

class ProductFormScreen extends StatefulWidget {
  final Map<String, dynamic>? product;

  const ProductFormScreen({super.key, this.product});

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _descController = TextEditingController();
  final _stockController = TextEditingController();

  String? _selectedCategoryId;
  String _selectedPriority = 'medium';
  File? _imageFile;
  final _picker = ImagePicker();
  bool _isLoading = false;
  String _errorText = "";

  @override
  void initState() {
    super.initState();
    if (widget.product != null) {
      _nameController.text = widget.product!['name'] ?? '';
      _priceController.text = widget.product!['price']?.toString() ?? '';
      _descController.text = widget.product!['description'] ?? '';
      _stockController.text = widget.product!['stock']?.toString() ?? '0';
      _selectedCategoryId = widget.product!['categoryId']?.toString() ?? widget.product!['category']?['id']?.toString();
      _selectedPriority = widget.product!['priority'] ?? 'medium';
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source);
      if (picked != null) {
        setState(() {
          _imageFile = File(picked.path);
        });
      }
    } catch (_) {}
  }

  void _showImagePickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardOpacityBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Select Product Image Source',
                style: TextStyle(fontFamily: 'Outfit', color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: AppColors.accent),
                title: const Text('Capture with Camera', style: TextStyle(color: AppColors.textPrimary)),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: AppColors.accentLight),
                title: const Text('Choose from Photo Gallery', style: TextStyle(color: AppColors.textPrimary)),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _submitForm() async {
    if (_nameController.text.trim().isEmpty ||
        _priceController.text.trim().isEmpty ||
        _selectedCategoryId == null ||
        _stockController.text.trim().isEmpty) {
      setState(() => _errorText = "Please fill all required catalog fields");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    final success = await context.read<ProductsProvider>().saveProduct(
          id: widget.product?['id'],
          name: _nameController.text.trim(),
          price: _priceController.text.trim(),
          categoryId: _selectedCategoryId!,
          description: _descController.text.trim(),
          stock: _stockController.text.trim(),
          priority: _selectedPriority,
          imageFile: _imageFile,
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.product != null ? 'Product modified successfully!' : 'Product added successfully!'),
          backgroundColor: AppColors.green,
        ),
      );
      Navigator.pop(context);
    } else {
      setState(() => _errorText = "Failed to save product details. Try again.");
    }
    setState(() => _isLoading = false);
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Outfit',
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        GlassInput(
          controller: controller,
          hint: hint,
          keyboardType: keyboardType,
          maxLines: maxLines,
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final catProvider = context.watch<CategoriesProvider>();
    final isEdit = widget.product != null;

    return GlassScaffold(
      title: isEdit ? 'Modify Product' : 'Add New Product',
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Product Artwork', style: TextStyle(fontFamily: 'Outfit', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: _showImagePickerSheet,
                  child: GlassCard(
                    padding: EdgeInsets.zero,
                    child: SizedBox(
                      height: 180,
                      child: _imageFile != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Image.file(_imageFile!, fit: BoxFit.cover),
                            )
                          : (isEdit && (widget.product!['imageUrl'] != null))
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(20),
                                  child: Image.network(widget.product!['imageUrl'], fit: BoxFit.cover),
                                )
                              : Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.add_photo_alternate, color: AppColors.accent, size: 40),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Click to Capture or Choose Art',
                                      style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted, fontSize: 13),
                                    ),
                                  ],
                                ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                _buildTextField(controller: _nameController, label: 'Product Title', hint: 'e.g. Cotton Polo Tee'),
                _buildTextField(controller: _priceController, label: 'Retail Price (₹)', hint: 'e.g. 999', keyboardType: TextInputType.number),
                _buildTextField(controller: _stockController, label: 'Stock Units', hint: 'e.g. 50', keyboardType: TextInputType.number),

                Text(
                  'Catalog Category',
                  style: TextStyle(fontFamily: 'Outfit', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      dropdownColor: AppColors.cardOpacityBg,
                      value: _selectedCategoryId,
                      hint: Text('Select category', style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted)),
                      style: TextStyle(fontFamily: 'Inter', color: AppColors.textPrimary),
                      icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.accent),
                      isExpanded: true,
                      onChanged: (String? val) {
                        setState(() {
                          _selectedCategoryId = val;
                        });
                      },
                      items: catProvider.categories.map<DropdownMenuItem<String>>((dynamic cat) {
                        return DropdownMenuItem<String>(
                          value: cat['id']?.toString() ?? '',
                          child: Text(cat['name'] ?? 'Category'),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                Text(
                  'Product Priority',
                  style: TextStyle(fontFamily: 'Outfit', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedPriority = 'low'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _selectedPriority == 'low' ? AppColors.green.withOpacity(0.12) : AppColors.cardOpacityBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: _selectedPriority == 'low' ? AppColors.green : AppColors.cardBorder),
                          ),
                          child: Text('Low', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Outfit', color: _selectedPriority == 'low' ? AppColors.green : AppColors.textPrimary54, fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedPriority = 'medium'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _selectedPriority == 'medium' ? AppColors.amber.withOpacity(0.12) : AppColors.cardOpacityBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: _selectedPriority == 'medium' ? AppColors.amber : AppColors.cardBorder),
                          ),
                          child: Text('Medium', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Outfit', color: _selectedPriority == 'medium' ? AppColors.amber : AppColors.textPrimary54, fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedPriority = 'high'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _selectedPriority == 'high' ? AppColors.red.withOpacity(0.12) : AppColors.cardOpacityBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: _selectedPriority == 'high' ? AppColors.red : AppColors.cardBorder),
                          ),
                          child: Text('High', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Outfit', color: _selectedPriority == 'high' ? AppColors.red : AppColors.textPrimary54, fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                _buildTextField(controller: _descController, label: 'Description', hint: 'Product descriptions, size charts...', maxLines: 4),
                const SizedBox(height: 16),

                if (_errorText.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.red.withOpacity(0.2)),
                    ),
                    child: Text(_errorText, style: TextStyle(fontFamily: 'Inter', color: Color(0xFFFCA5A5), fontSize: 13), textAlign: TextAlign.center),
                  ),

                GlassButton(
                  label: isEdit ? 'Modify Product Specifications' : 'Publish Product to Catalog',
                  onPressed: _isLoading ? null : _submitForm,
                  isLoading: _isLoading,
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
