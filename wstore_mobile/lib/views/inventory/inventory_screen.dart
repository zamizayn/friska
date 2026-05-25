import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import '../../providers/products_provider.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final _searchController = TextEditingController();
  int _currentPage = 1;
  bool _lowStockOnly = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductsProvider>().setFilters(search: '', stockStatus: '');
      context.read<ProductsProvider>().fetchProducts();
    });
  }

  void _onSearchChanged(String query) {
    _currentPage = 1;
    context.read<ProductsProvider>().setFilters(search: query);
    context.read<ProductsProvider>().fetchProducts();
  }

  void _toggleLowStock() {
    setState(() {
      _lowStockOnly = !_lowStockOnly;
      _currentPage = 1;
    });
    context.read<ProductsProvider>().setFilters(stockStatus: _lowStockOnly ? 'low' : '');
    context.read<ProductsProvider>().fetchProducts();
  }

  void _goToPage(int page) {
    setState(() => _currentPage = page);
    context.read<ProductsProvider>().fetchProducts(page: page);
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
          backgroundColor: AppColors.green,
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductsProvider>();

    return GlassScaffold(
      title: 'Stock Operations',
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Row(
              children: [
                Expanded(
                  child: GlassInput(
                    controller: _searchController,
                    hint: 'Search product stock levels...',
                    prefixIcon: const Icon(Icons.search, color: AppColors.accent, size: 20),
                    onChanged: _onSearchChanged,
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _toggleLowStock,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      color: _lowStockOnly ? AppColors.red.withOpacity(0.12) : AppColors.cardBg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: _lowStockOnly ? AppColors.red : AppColors.cardBorder),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.warning_amber, color: _lowStockOnly ? AppColors.red : AppColors.textPrimary54, size: 18),
                        const SizedBox(width: 4),
                        Text('Low', style: TextStyle(fontFamily: 'Outfit', color: _lowStockOnly ? AppColors.red : AppColors.textPrimary54, fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent)),
                  )
                : provider.products.isEmpty
                    ? Center(
                        child: Text(
                          'No products found matching filters',
                          style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted),
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

                          Color stockColor = AppColors.green;
                          if (stock == 0) {
                            stockColor = AppColors.red;
                          } else if (stock <= 10) {
                            stockColor = AppColors.amber;
                          }

                          return GlassCard(
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
                                            style: TextStyle(fontFamily: 'Outfit', color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Category: $categoryName',
                                            style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted, fontSize: 11),
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
                                        style: TextStyle(fontFamily: 'Outfit', color: stockColor, fontWeight: FontWeight.bold, fontSize: 11),
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
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.accent.withOpacity(0.3))),
                                      child: const Text('+1', style: TextStyle(color: AppColors.accentLight)),
                                    ),
                                    OutlinedButton(
                                      onPressed: () => _updateStockValue(product, 10),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.accent.withOpacity(0.3))),
                                      child: const Text('+10', style: TextStyle(color: AppColors.accentLight)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          if (provider.pagination['totalPages'] > 1)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                border: Border(top: BorderSide(color: AppColors.cardBorder)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left, color: AppColors.textPrimary),
                    onPressed: _currentPage > 1 ? () => _goToPage(_currentPage - 1) : null,
                  ),
                  Text(
                    'Page ${_currentPage} of ${provider.pagination['totalPages']}',
                    style: TextStyle(fontFamily: 'Outfit', color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right, color: AppColors.textPrimary),
                    onPressed: _currentPage < (provider.pagination['totalPages'] ?? 1) ? () => _goToPage(_currentPage + 1) : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
