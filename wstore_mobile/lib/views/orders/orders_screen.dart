import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/orders_provider.dart';
import 'order_details_screen.dart';
import 'create_order_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final currencyFormat =
      NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);
  final searchController = TextEditingController();

  final List<Map<String, String>> _statusFilters = [
    {'key': '', 'label': 'All'},
    {'key': 'pending', 'label': 'Pending'},
    {'key': 'shipped', 'label': 'Shipped'},
    {'key': 'delivered', 'label': 'Delivered'},
    {'key': 'cancelled', 'label': 'Cancelled'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrdersProvider>().fetchOrders();
    });
  }

  void _onSearchChanged(String query) {
    context.read<OrdersProvider>().setFilters(search: query);
    context.read<OrdersProvider>().fetchOrders();
  }

  void _onStatusChanged(String status) {
    context.read<OrdersProvider>().setFilters(status: status);
    context.read<OrdersProvider>().fetchOrders();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'shipped':
        return const Color(0xFF3B82F6);
      case 'delivered':
        return const Color(0xFF10B981);
      case 'cancelled':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF64748B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrdersProvider>();
    final pagination = provider.pagination;
    final currentPage =
        int.tryParse(pagination['page']?.toString() ?? '1') ?? 1;
    final totalPages =
        int.tryParse(pagination['totalPages']?.toString() ?? '1') ?? 1;

    return Scaffold(
      backgroundColor: AppColors.background,
      // floatingActionButton: FloatingActionButton(
      //   backgroundColor: const Color(0xFF6366F1),
      //   child: const Icon(Icons.add, color: AppColors.textPrimary),
      //   onPressed: () {
      //     Navigator.push(
      //       context,
      //       MaterialPageRoute(builder: (context) => const CreateOrderScreen()),
      //     );
      //   },
      // ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter & Search Header
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                // Search field
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
                      hintText: 'Search order ID, client phone...',
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
                // Status Filter Row
                SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _statusFilters.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final filter = _statusFilters[index];
                      final isSelected = filter['key'] == provider.status;
                      return GestureDetector(
                        onTap: () => _onStatusChanged(filter['key']!),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF6366F1)
                                : AppColors.cardOpacityBg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFF6366F1)
                                  : AppColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            filter['label']!,
                            style: GoogleFonts.outfit(
                              color: isSelected
                                  ? Colors.white
                                  : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          // Orders List Log
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor:
                          AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                    ),
                  )
                : provider.orders.isEmpty
                    ? Center(
                        child: Text(
                          'No orders found matching filters',
                          style:
                              GoogleFonts.inter(color: const Color(0xFF475569)),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: provider.orders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final order = provider.orders[index];
                          final id = order['id'] ?? 0;
                          final custName = order['customerName'] ??
                              order['customer']?['name'] ??
                              'N/A';
                          final status = order['status'] ?? 'pending';
                          final date = order['createdAt'] != null
                              ? order['createdAt'].toString().split('T')[0]
                              : 'Today';
                          final totalVal = double.tryParse(
                                  order['total']?.toString() ?? '0') ??
                              0.0;
                          final statusColor = _getStatusColor(status);

                          return InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      OrderDetailsScreen(order: order),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.cardBg,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              'Order #$id',
                                              style: GoogleFonts.outfit(
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: statusColor
                                                    .withOpacity(0.12),
                                                borderRadius:
                                                    BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                status.toUpperCase(),
                                                style: GoogleFonts.outfit(
                                                  color: statusColor,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 10,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          custName,
                                          style: GoogleFonts.inter(
                                            color: const Color(0xFF94A3B8),
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          date,
                                          style: GoogleFonts.inter(
                                            color: const Color(0xFF475569),
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    currencyFormat.format(totalVal),
                                    style: GoogleFonts.outfit(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF6366F1),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward_ios,
                                      color: AppColors.textPrimary24, size: 14),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          // Pagination Panel
          if (totalPages > 1)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.textPrimary10)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ElevatedButton(
                    onPressed: currentPage > 1
                        ? () => provider.fetchOrders(page: currentPage - 1)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.cardOpacityBg,
                      disabledBackgroundColor: Colors.transparent,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Previous'),
                  ),
                  Text(
                    'Page $currentPage of $totalPages',
                    style: GoogleFonts.inter(
                        color: const Color(0xFF64748B), fontSize: 13),
                  ),
                  ElevatedButton(
                    onPressed: currentPage < totalPages
                        ? () => provider.fetchOrders(page: currentPage + 1)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.cardOpacityBg,
                      disabledBackgroundColor: Colors.transparent,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Next'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
