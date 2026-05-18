import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/orders_provider.dart';
import '../../providers/products_provider.dart';

class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final currencyFormat = NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);

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

  void _onSearchChanged(String query) {
    if (query.trim().isEmpty) return;
    context.read<ProductsProvider>().fetchSuggestions(query);
  }

  void _addSuggestionToBasket(Map<String, dynamic> product) {
    final productId = product['id'];
    final existingIndex = _basketItems.indexWhere((item) => item['id'] == productId);

    setState(() {
      if (existingIndex >= 0) {
        _basketItems[existingIndex]['quantity'] += 1;
      } else {
        _basketItems.add({
          'id': productId,
          'name': product['name'],
          'price': double.tryParse(product['price']?.toString() ?? '0') ?? 0.0,
          'quantity': 1,
        });
      }
      _searchController.clear();
      context.read<ProductsProvider>().fetchSuggestions(''); // Clear suggestions list
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
      setState(() => _errorText = "Please add at least one product to the basket");
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
          items: _basketItems.map((item) => {
            'productId': item['id'],
            'quantity': item['quantity'],
            'price': item['price'],
          }).toList(),
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Manual Order created successfully!'), backgroundColor: Color(0xFF10B981)),
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
          style: GoogleFonts.outfit(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.inter(color: const Color(0xFF475569)),
              prefixIcon: icon != null ? Icon(icon, color: const Color(0xFF6366F1), size: 20) : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final productsProvider = context.watch<ProductsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Place Manual Order', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Customer Specifications', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 14),
                _buildTextField(controller: _nameController, label: 'Customer Name', hint: 'e.g. Rahul Sharma', icon: Icons.person),
                _buildTextField(controller: _phoneController, label: 'Phone Number', hint: '+91...', icon: Icons.phone, keyboardType: TextInputType.phone),
                _buildTextField(controller: _addressController, label: 'Delivery Address / Map URL', hint: 'Full shipping details...', icon: Icons.location_on),
                
                // Payment Method
                Text(
                  'Payment Mode',
                  style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _paymentMethod = 'Cash on Delivery'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _paymentMethod == 'Cash on Delivery' ? const Color(0xFF6366F1).withOpacity(0.12) : AppColors.cardBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _paymentMethod == 'Cash on Delivery' ? const Color(0xFF6366F1) : AppColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            'COD',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _paymentMethod = 'Prepaid'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _paymentMethod == 'Prepaid' ? const Color(0xFF6366F1).withOpacity(0.12) : AppColors.cardBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _paymentMethod == 'Prepaid' ? const Color(0xFF6366F1) : AppColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            'Prepaid',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Basket Search
                Text('Add Items to Basket', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Type item name to search catalog...',
                      hintStyle: GoogleFonts.inter(color: const Color(0xFF475569)),
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF6366F1), size: 20),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                
                // Suggestions dropdown
                if (productsProvider.suggestions.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    constraints: const BoxConstraints(maxHeight: 200),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.textPrimary12),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: productsProvider.suggestions.length,
                      separatorBuilder: (_, __) => const Divider(color: AppColors.textPrimary10, height: 1),
                      itemBuilder: (context, index) {
                        final product = productsProvider.suggestions[index];
                        final name = product['name'] ?? 'Product';
                        final price = double.tryParse(product['price']?.toString() ?? '0') ?? 0.0;
                        return ListTile(
                          title: Text(name, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13)),
                          trailing: Text(currencyFormat.format(price), style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
                          onTap: () => _addSuggestionToBasket(product),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 24),

                // Basket Items List
                Text('Basket Overview', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: _basketItems.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(28.0),
                          child: Center(
                            child: Text(
                              'Basket is currently empty',
                              style: GoogleFonts.inter(color: const Color(0xFF475569)),
                            ),
                          ),
                        )
                      : Column(
                          children: [
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _basketItems.length,
                              separatorBuilder: (_, __) => const Divider(color: AppColors.textPrimary10, height: 1),
                              itemBuilder: (context, index) {
                                final item = _basketItems[index];
                                final name = item['name'];
                                final qty = item['quantity'];
                                final price = item['price'];

                                return ListTile(
                                  title: Text(name, style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                                  subtitle: Text(currencyFormat.format(price), style: const TextStyle(color: Color(0xFF64748B))),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove_circle_outline, color: AppColors.textPrimary54, size: 20),
                                        onPressed: () => _updateQuantity(index, -1),
                                      ),
                                      Text(
                                        qty.toString(),
                                        style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add_circle_outline, color: Color(0xFF6366F1), size: 20),
                                        onPressed: () => _updateQuantity(index, 1),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                            const Divider(color: AppColors.textPrimary10, height: 1),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Grand Total Sum',
                                    style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    currencyFormat.format(_grandTotal),
                                    style: GoogleFonts.outfit(color: const Color(0xFF6366F1), fontWeight: FontWeight.w900, fontSize: 18),
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
                      color: const Color(0xFFEF4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                    ),
                    child: Text(_errorText, style: GoogleFonts.inter(color: const Color(0xFFFCA5A5), fontSize: 13), textAlign: TextAlign.center),
                  ),

                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFA855F7)]),
                  ),
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitManualOrder,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 3, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                          )
                        : Text(
                            'Compile & Place Order',
                            style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                          ),
                  ),
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