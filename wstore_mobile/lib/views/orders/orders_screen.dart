import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../widgets/glass_scaffold.dart';
import '../../providers/orders_provider.dart';
import 'order_details_screen.dart';

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
    searchController.addListener(() {
      _onSearchChanged(searchController.text);
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

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrdersProvider>();
    final pagination = provider.pagination;
    final currentPage =
        int.tryParse(pagination['page']?.toString() ?? '1') ?? 1;
    final totalPages =
        int.tryParse(pagination['totalPages']?.toString() ?? '1') ?? 1;

    return GlassScaffold(
      title: 'Orders',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter & Search Header
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                // Search field
                GlassInput(
                  controller: searchController,
                  hint: 'Search order ID, client phone...',
                  prefixIcon: const Icon(Icons.search,
                      color: AppColors.accent, size: 20),
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
                      return GlassChip(
                        label: filter['label']!,
                        selected: isSelected,
                        onTap: () => _onStatusChanged(filter['key']!),
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
                          AlwaysStoppedAnimation<Color>(AppColors.accent),
                    ),
                  )
                : provider.orders.isEmpty
                    ? Center(
                        child: Text(
                          'No orders found matching filters',
                          style: TextStyle(color: AppColors.textMuted),
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
                          final statusColor = status.toString().statusColor;

                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      OrderDetailsScreen(order: order),
                                ),
                              );
                            },
                            child: GlassCard(
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
                                              style: const TextStyle(
                                                fontFamily: 'Outfit',
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
                                                style: TextStyle(
                                                  fontFamily: 'Outfit',
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
                                          style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          date,
                                          style: const TextStyle(
                                            color: AppColors.textMuted,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    currencyFormat.format(totalVal),
                                    style: const TextStyle(
                                      fontFamily: 'Outfit',
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                      color: AppColors.accent,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward_ios,
                                      color: AppColors.textPrimary24,
                                      size: 14),
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
                border:
                    Border(top: BorderSide(color: AppColors.textPrimary10)),
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
                      foregroundColor: AppColors.textPrimary,
                    ),
                    child: const Text('Previous'),
                  ),
                  Text(
                    'Page $currentPage of $totalPages',
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 13),
                  ),
                  ElevatedButton(
                    onPressed: currentPage < totalPages
                        ? () => provider.fetchOrders(page: currentPage + 1)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.cardOpacityBg,
                      disabledBackgroundColor: Colors.transparent,
                      foregroundColor: AppColors.textPrimary,
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
