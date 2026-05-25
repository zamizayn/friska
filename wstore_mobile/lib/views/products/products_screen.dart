import 'package:wstore_mobile/config/theme_config.dart';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/products_provider.dart';
import '../../providers/categories_provider.dart';
import 'product_form_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final currencyFormat =
      NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);
  final searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductsProvider>().fetchProducts();
      context.read<CategoriesProvider>().fetchCategories();
    });
  }

  void _onSearchChanged(String query) {
    context.read<ProductsProvider>().setFilters(search: query);
    context.read<ProductsProvider>().fetchProducts();
  }

  void _onCategoryChanged(String categoryId) {
    context.read<ProductsProvider>().setFilters(categoryId: categoryId);
    context.read<ProductsProvider>().fetchProducts();
  }

  void _onSortChanged(String sort) {
    if (sort == 'price_low') {
      context
          .read<ProductsProvider>()
          .setFilters(sortBy: 'price', sortOrder: 'ASC');
    } else if (sort == 'price_high') {
      context
          .read<ProductsProvider>()
          .setFilters(sortBy: 'price', sortOrder: 'DESC');
    } else {
      context
          .read<ProductsProvider>()
          .setFilters(sortBy: 'newest', sortOrder: 'DESC');
    }
    context.read<ProductsProvider>().fetchProducts();
  }

  void _showMetaSyncStatus(int productId, String name) {
    final provider = context.read<ProductsProvider>();
    provider.fetchMetaStatus(productId);

    showDialog(
      context: context,
      builder: (context) {
        return Consumer<ProductsProvider>(
          builder: (context, p, child) {
            final isLoad = p.metaLoading;
            final status = p.metaStatus;

            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  const Icon(Icons.sync_alt, color: Color(0xFF6366F1)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Meta Catalog Status',
                      style: GoogleFonts.outfit(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              content: isLoad
                  ? const SizedBox(
                      height: 100,
                      child: Center(
                        child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                                Color(0xFF6366F1))),
                      ),
                    )
                  : status == null
                      ? const Text(
                          'Could not load validation status from Meta Catalog API',
                          style: TextStyle(color: AppColors.textPrimary60))
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              name,
                              style: GoogleFonts.outfit(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14),
                            ),
                            const SizedBox(height: 12),
                            const Divider(color: AppColors.textPrimary10),
                            const SizedBox(height: 12),
                            _buildMetaStatusRow(
                                'Approval Status',
                                status['approved'] == true
                                    ? 'Approved'
                                    : 'Pending Review',
                                status['approved'] == true
                                    ? Colors.green
                                    : Colors.amber),
                            _buildMetaStatusRow(
                                'Visibility Status',
                                status['visible'] == true
                                    ? 'Visible'
                                    : 'Hidden',
                                status['visible'] == true
                                    ? Colors.blue
                                    : Colors.orange),
                            _buildMetaStatusRow(
                                'Commerce Error Check',
                                status['hasErrors'] == true
                                    ? 'Errors Found'
                                    : 'Clean',
                                status['hasErrors'] == true
                                    ? Colors.red
                                    : Colors.green),
                            if (status['errorDetails'] != null) ...[
                              const SizedBox(height: 10),
                              Text(
                                'Error Details: ${status['errorDetails']}',
                                style: const TextStyle(
                                    color: Colors.redAccent, fontSize: 11),
                              ),
                            ],
                          ],
                        ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close',
                      style: TextStyle(color: AppColors.textPrimary54)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildMetaStatusRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: GoogleFonts.inter(
                  color: const Color(0xFF64748B), fontSize: 12)),
          Text(value,
              style: GoogleFonts.outfit(
                  color: color, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  void _showProductOptions(Map<String, dynamic> product) {
    final id = product['id'] ?? 0;
    final name = product['name'] ?? 'Product';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                name,
                style: GoogleFonts.outfit(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.sync, color: Color(0xFF6366F1)),
                title: const Text('Meta Catalog Integration Status',
                    style: TextStyle(color: AppColors.textPrimary)),
                onTap: () {
                  Navigator.pop(context);
                  _showMetaSyncStatus(id, name);
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit, color: AppColors.textPrimary70),
                title: const Text('Modify Product Details',
                    style: TextStyle(color: AppColors.textPrimary)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ProductFormScreen(product: product),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete, color: Color(0xFFEF4444)),
                title: const Text('Remove Product',
                    style: TextStyle(color: Color(0xFFEF4444))),
                onTap: () async {
                  Navigator.pop(context);
                  final success =
                      await context.read<ProductsProvider>().deleteProduct(id);
                  if (success && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Product removed successfully'),
                          backgroundColor: Color(0xFF10B981)),
                    );
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductsProvider>();
    final catProvider = context.watch<CategoriesProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: AppColors.textPrimary),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ProductFormScreen()),
          );
        },
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header search filters
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                // Search bar
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardOpacityBg,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: TextField(
                    controller: searchController,
                    onChanged: _onSearchChanged,
                    style: GoogleFonts.inter(
                        color: AppColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Search product title, SKU...',
                      hintStyle:
                          GoogleFonts.inter(color: const Color(0xFF475569)),
                      prefixIcon: const Icon(Icons.search,
                          color: Color(0xFF6366F1), size: 20),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Sorting & Category Pills Row
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 38,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            GestureDetector(
                              onTap: () => _onCategoryChanged(''),
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: provider.categoryId.isEmpty
                                      ? const Color(0xFF6366F1)
                                      : AppColors.cardOpacityBg,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                      color: provider.categoryId.isEmpty
                                          ? const Color(0xFF6366F1)
                                          : AppColors.cardBorder),
                                ),
                                child: Text('All',
                                    style: GoogleFonts.outfit(
                                        color: AppColors.textPrimary,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13)),
                              ),
                            ),
                            ...catProvider.categories.map((dynamic cat) {
                              final idStr = cat['id']?.toString() ?? '';
                              final isSelect = provider.categoryId == idStr;
                              return GestureDetector(
                                onTap: () => _onCategoryChanged(idStr),
                                child: Container(
                                  margin: const EdgeInsets.only(right: 8),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelect
                                        ? const Color(0xFF6366F1)
                                        : AppColors.cardOpacityBg,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                        color: isSelect
                                            ? const Color(0xFF6366F1)
                                            : AppColors.cardBorder),
                                  ),
                                  child: Text(
                                    cat['name'] ?? 'Cat',
                                    style: GoogleFonts.outfit(
                                        color: isSelect
                                            ? Colors.white
                                            : const Color(0xFF94A3B8),
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13),
                                  ),
                                ),
                              );
                            }).toList(),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: AppColors.cardOpacityBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          dropdownColor: AppColors.surface,
                          value: provider.sortBy == 'price'
                              ? (provider.sortOrder == 'ASC'
                                  ? 'price_low'
                                  : 'price_high')
                              : 'newest',
                          style: GoogleFonts.outfit(
                              color: AppColors.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600),
                          icon: const Icon(Icons.arrow_drop_down,
                              color: Color(0xFF6366F1)),
                          onChanged: (val) => _onSortChanged(val!),
                          items: const [
                            DropdownMenuItem(
                                value: 'newest', child: Text('Newest')),
                            DropdownMenuItem(
                                value: 'price_low', child: Text('Price: Low')),
                            DropdownMenuItem(
                                value: 'price_high',
                                child: Text('Price: High')),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Grid Layout Catalog
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor:
                          AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                    ),
                  )
                : provider.products.isEmpty
                    ? Center(
                        child: Text(
                          'No products found matching filters',
                          style:
                              GoogleFonts.inter(color: const Color(0xFF475569)),
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          childAspectRatio: 0.72,
                        ),
                        itemCount: provider.products.length,
                        itemBuilder: (context, index) {
                          final prod = provider.products[index];
                          final name = prod['name'] ?? 'Product';
                          final price = double.tryParse(
                                  prod['price']?.toString() ?? '0') ??
                              0.0;
                          final stock =
                              int.tryParse(prod['stock']?.toString() ?? '0') ??
                                  0;
                          final imageUrl = prod['image'] ?? '';

                          Color stockColor = Colors.green;
                          if (stock == 0) {
                            stockColor = Colors.red;
                          } else if (stock <= 10) {
                            stockColor = Colors.orange;
                          }

                          return InkWell(
                            onTap: () => _showProductOptions(prod),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.cardBg,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Product Image
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: const BorderRadius.vertical(
                                          top: Radius.circular(20)),
                                      child: imageUrl.isNotEmpty
                                          ? Image.network(
                                              imageUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  const Center(
                                                child: Icon(Icons.image,
                                                    color:
                                                        AppColors.textPrimary24,
                                                    size: 40),
                                              ),
                                            )
                                          : const Center(
                                              child: Icon(Icons.image,
                                                  color:
                                                      AppColors.textPrimary24,
                                                  size: 40),
                                            ),
                                    ),
                                  ),
                                  // Product Info
                                  Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name,
                                          style: GoogleFonts.outfit(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              currencyFormat.format(price),
                                              style: GoogleFonts.outfit(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w900,
                                                color: const Color(0xFF6366F1),
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: stockColor
                                                    .withOpacity(0.12),
                                                borderRadius:
                                                    BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                stock == 0
                                                    ? 'OUT'
                                                    : '$stock left',
                                                style: GoogleFonts.outfit(
                                                  color: stockColor,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 9,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
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
