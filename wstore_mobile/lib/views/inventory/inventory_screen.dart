import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/products_provider.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductsProvider>().setFilters(search: '');
      context.read<ProductsProvider>().fetchProducts();
    });
  }

  void _onSearchChanged(String query) {
    context.read<ProductsProvider>().setFilters(search: query);
    context.read<ProductsProvider>().fetchProducts();
  }

  Future<void> _updateStockValue(Map<String, dynamic> product, int delta) async {
    final provider = context.read<ProductsProvider>();
    final currentStock = int.tryParse(product['stock']?.toString() ?? '0') ?? 0;
    final newStock = currentStock + delta;
    if (newStock < 0) return;

    final id = product['id'];
    final name = product['name'] ?? '';
    final price = product['price']?.toString() ?? '0';
    final categoryId = product['categoryId']?.toString() ?? product['category']?['id']?.toString() ?? '';
    final description = product['description'] ?? '';

    final success = await provider.saveProduct(
          id: id,
          name: name,
          price: price,
          categoryId: categoryId,
          description: description,
          stock: newStock.toString(),
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Stock count updated for $name! ($currentStock -> $newStock)'),
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Stock Operations', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
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
                  hintText: 'Search product stock levels...',
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
                : provider.products.isEmpty
                    ? Center(
                        child: Text(
                          'No products found matching filters',
                          style: GoogleFonts.inter(color: const Color(0xFF475569)),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: provider.products.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final product = provider.products[index];
                          final name = product['name'] ?? 'Product';
                          final stock = int.tryParse(product['stock']?.toString() ?? '0') ?? 0;
                          final categoryName = product['category']?['name'] ?? 'General';

                          Color stockColor = Colors.green;
                          if (stock == 0) {
                            stockColor = Colors.red;
                          } else if (stock <= 10) {
                            stockColor = Colors.orange;
                          }

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            name,
                                            style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Category: $categoryName',
                                            style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: stockColor.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        stock == 0 ? 'OUT OF STOCK' : '$stock units',
                                        style: GoogleFonts.outfit(color: stockColor, fontWeight: FontWeight.bold, fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                const Divider(color: AppColors.textPrimary10, height: 1),
                                const SizedBox(height: 14),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    OutlinedButton(
                                      onPressed: () => _updateStockValue(product, -10),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.cardBorder)),
                                      child: const Text('-10', style: TextStyle(color: AppColors.textPrimary54)),
                                    ),
                                    OutlinedButton(
                                      onPressed: () => _updateStockValue(product, -1),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.cardBorder)),
                                      child: const Text('-1', style: TextStyle(color: AppColors.textPrimary54)),
                                    ),
                                    OutlinedButton(
                                      onPressed: () => _updateStockValue(product, 1),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: Color(0xFF6366F1).withOpacity(0.3))),
                                      child: const Text('+1', style: TextStyle(color: Color(0xFF818CF8))),
                                    ),
                                    OutlinedButton(
                                      onPressed: () => _updateStockValue(product, 10),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: Color(0xFF6366F1).withOpacity(0.3))),
                                      child: const Text('+10', style: TextStyle(color: Color(0xFF818CF8))),
                                    ),
                                  ],
                                ),
                              ],
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