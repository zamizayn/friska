import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../widgets/glass_scaffold.dart';
import '../../providers/orders_provider.dart';
import '../../providers/products_provider.dart';

class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final currencyFormat =
      NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _searchController = TextEditingController();

  String _paymentMethod = 'Cash on Delivery';
  final List<Map<String, dynamic>> _basketItems = [];
  bool _isLoading = false;
  String _errorText = "";

  double get _grandTotal {
    return _basketItems.fold<double>(0.0, (sum, item) {
      final price = double.tryParse(item['price']?.toString() ?? '0') ?? 0.0;
      final qty = int.tryParse(item['quantity']?.toString() ?? '1') ?? 1;
      return sum + (price * qty);
    });
  }

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      _onSearchChanged(_searchController.text);
    });
  }

  void _onSearchChanged(String query) {
    if (query.trim().isEmpty) return;
    context.read<ProductsProvider>().fetchSuggestions(query);
  }

  void _addSuggestionToBasket(Map<String, dynamic> product) {
    final productId = product['id'];
    final existingIndex =
        _basketItems.indexWhere((item) => item['id'] == productId);

    setState(() {
      if (existingIndex >= 0) {
        _basketItems[existingIndex]['quantity'] += 1;
      } else {
        _basketItems.add({
          'id': productId,
          'name': product['name'],
          'price':
              double.tryParse(product['price']?.toString() ?? '0') ?? 0.0,
          'quantity': 1,
        });
      }
      _searchController.clear();
      context
          .read<ProductsProvider>()
          .fetchSuggestions(''); // Clear suggestions list
    });
  }

  void _updateQuantity(int index, int delta) {
    setState(() {
      final newQty = _basketItems[index]['quantity'] + delta;
      if (newQty <= 0) {
        _basketItems.removeAt(index);
      } else {
        _basketItems[index]['quantity'] = newQty;
      }
    });
  }

  Future<void> _submitManualOrder() async {
    if (_nameController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _addressController.text.trim().isEmpty) {
      setState(() => _errorText = "Please fill all customer details");
      return;
    }
    if (_basketItems.isEmpty) {
      setState(
          () => _errorText = "Please add at least one product to the basket");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = "";
    });

    final success = await context.read<OrdersProvider>().createManualOrder(
          customerName: _nameController.text.trim(),
          customerPhone: _phoneController.text.trim(),
          address: _addressController.text.trim(),
          paymentMethod: _paymentMethod,
          items: _basketItems
              .map((item) => {
                    'productId': item['id'],
                    'quantity': item['quantity'],
                    'price': item['price'],
                  })
              .toList(),
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Manual Order created successfully!'),
            backgroundColor: AppColors.green),
      );
      Navigator.pop(context);
    } else {
      setState(() => _errorText = "Failed to submit order. Try again.");
    }
    setState(() => _isLoading = false);
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    IconData? icon,
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
          prefixIcon: icon != null
              ? Icon(icon, color: AppColors.accent, size: 20)
              : null,
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final productsProvider = context.watch<ProductsProvider>();

    return GlassScaffold(
      title: 'Place Manual Order',
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Customer Specifications',
                    style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 14),
                _buildTextField(
                    controller: _nameController,
                    label: 'Customer Name',
                    hint: 'e.g. Rahul Sharma',
                    icon: Icons.person),
                _buildTextField(
                    controller: _phoneController,
                    label: 'Phone Number',
                    hint: '+91...',
                    icon: Icons.phone,
                    keyboardType: TextInputType.phone),
                _buildTextField(
                    controller: _addressController,
                    label: 'Delivery Address / Map URL',
                    hint: 'Full shipping details...',
                    icon: Icons.location_on),

                // Payment Method
                const Text(
                  'Payment Mode',
                  style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _paymentMethod = 'Cash on Delivery'),
                        child: Container(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _paymentMethod == 'Cash on Delivery'
                                ? AppColors.accent.withOpacity(0.12)
                                : AppColors.cardBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _paymentMethod == 'Cash on Delivery'
                                  ? AppColors.accent
                                  : AppColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            'COD',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontFamily: 'Outfit',
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _paymentMethod = 'Prepaid'),
                        child: Container(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _paymentMethod == 'Prepaid'
                                ? AppColors.accent.withOpacity(0.12)
                                : AppColors.cardBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _paymentMethod == 'Prepaid'
                                  ? AppColors.accent
                                  : AppColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            'Prepaid',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontFamily: 'Outfit',
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Basket Search
                const Text('Add Items to Basket',
                    style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                GlassInput(
                  controller: _searchController,
                  hint: 'Type item name to search catalog...',
                  prefixIcon: const Icon(Icons.search,
                      color: AppColors.accent, size: 20),
                ),

                // Suggestions dropdown
                if (productsProvider.suggestions.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    constraints: const BoxConstraints(maxHeight: 200),
                    decoration: BoxDecoration(
                      color: AppColors.cardBg.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: productsProvider.suggestions.length,
                      separatorBuilder: (_, __) =>
                          const Divider(color: AppColors.textPrimary10, height: 1),
                      itemBuilder: (context, index) {
                        final product = productsProvider.suggestions[index];
                        final name = product['name'] ?? 'Product';
                        final price =
                            double.tryParse(product['price']?.toString() ?? '0') ??
                                0.0;
                        return ListTile(
                          title: Text(name,
                              style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 13)),
                          trailing: Text(
                            currencyFormat.format(price),
                            style: const TextStyle(
                                color: AppColors.accent,
                                fontWeight: FontWeight.bold),
                          ),
                          onTap: () => _addSuggestionToBasket(product),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 24),

                // Basket Items List
                const Text('Basket Overview',
                    style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                GlassCard(
                  padding: EdgeInsets.zero,
                  child: _basketItems.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(28.0),
                          child: Center(
                            child: Text(
                              'Basket is currently empty',
                              style: TextStyle(color: AppColors.textMuted),
                            ),
                          ),
                        )
                      : Column(
                          children: [
                            ListView.separated(
                              shrinkWrap: true,
                              physics:
                                  const NeverScrollableScrollPhysics(),
                              itemCount: _basketItems.length,
                              separatorBuilder: (_, __) => const Divider(
                                  color: AppColors.textPrimary10,
                                  height: 1),
                              itemBuilder: (context, index) {
                                final item = _basketItems[index];
                                final name = item['name'];
                                final qty = item['quantity'];
                                final price = item['price'];

                                return ListTile(
                                  title: Text(name,
                                      style: const TextStyle(
                                          fontFamily: 'Outfit',
                                          color: AppColors.textPrimary,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14)),
                                  subtitle: Text(
                                      currencyFormat.format(price),
                                      style: const TextStyle(
                                          color: AppColors.textMuted)),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(
                                            Icons.remove_circle_outline,
                                            color:
                                                AppColors.textPrimary54,
                                            size: 20),
                                        onPressed: () =>
                                            _updateQuantity(index, -1),
                                      ),
                                      Text(
                                        qty.toString(),
                                        style: const TextStyle(
                                            fontFamily: 'Outfit',
                                            color: AppColors.textPrimary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14),
                                      ),
                                      IconButton(
                                        icon: const Icon(
                                            Icons.add_circle_outline,
                                            color: AppColors.accent,
                                            size: 20),
                                        onPressed: () =>
                                            _updateQuantity(index, 1),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                            const Divider(
                                color: AppColors.textPrimary10,
                                height: 1),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Grand Total Sum',
                                    style: TextStyle(
                                        fontFamily: 'Outfit',
                                        color: AppColors.textPrimary,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    currencyFormat.format(_grandTotal),
                                    style: const TextStyle(
                                        fontFamily: 'Outfit',
                                        color: AppColors.accent,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 18),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 32),

                if (_errorText.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.red.withOpacity(0.2)),
                    ),
                    child: Text(_errorText,
                        style: const TextStyle(
                            fontFamily: 'Inter',
                            color: AppColors.red,
                            fontSize: 13),
                        textAlign: TextAlign.center),
                  ),

                GlassButton(
                  label: 'Compile & Place Order',
                  onPressed: _isLoading ? null : _submitManualOrder,
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
