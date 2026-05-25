import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../main.dart';
import '../../providers/orders_provider.dart';
import '../../services/storage_service.dart';
import 'order_detail_screen.dart';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> {
  int _selectedTab = 0;
  final _tabs = ['New', 'Active', 'Delivered'];
  int _pendingCount = 0;
  int _activeCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchOrders());
  }

  String? get _statusFilter {
    switch (_selectedTab) {
      case 0:
        return 'pending';
      case 1:
        return 'active';
      case 2:
        return 'delivered';
      default:
        return null;
    }
  }

  Future<void> _fetchOrders() async {
    await context.read<OrdersProvider>().fetchOrders(status: _statusFilter);
  }

  @override
  Widget build(BuildContext context) {
    final ordersProv = context.watch<OrdersProvider>();
    final orders = ordersProv.orders;

    _pendingCount = orders.where((o) => o.status == 'pending').length;
    _activeCount = orders
        .where((o) => o.status == 'accepted' || o.status == 'picked_up')
        .length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  StorageService.deliveryName.isNotEmpty
                      ? StorageService.deliveryName.split(' ').first
                      : '',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSegmentedControl(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchOrders,
              color: AppColors.primary,
              child: ordersProv.loading && orders.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : ordersProv.error != null
                      ? _buildError(ordersProv.error!)
                      : orders.isEmpty
                          ? _buildEmpty()
                          : _buildList(orders),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentedControl() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.border.withOpacity(0.5),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: List.generate(_tabs.length, (i) {
            final isSelected = _selectedTab == i;
            final count = i == 0 ? _pendingCount : (i == 1 ? _activeCount : null);
            return Expanded(
              child: GestureDetector(
                onTap: () {
                  if (_selectedTab != i) {
                    setState(() => _selectedTab = i);
                    _fetchOrders();
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutCubic,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(11),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _tabs[i],
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                      if (count != null && count > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.white.withOpacity(0.2)
                                : AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '$count',
                            style: GoogleFonts.poppins(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? Colors.white : AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildError(String error) {
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.5,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(Icons.wifi_off_rounded,
                        size: 32, color: AppColors.error),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    error,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _fetchOrders,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Try Again'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmpty() {
    final messages = {
      0: 'No new orders assigned',
      1: 'No active deliveries',
      2: 'No completed deliveries',
    };
    final icons = {
      0: Icons.inbox_rounded,
      1: Icons.delivery_dining_outlined,
      2: Icons.check_circle_outline_rounded,
    };

    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.5,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Icon(
                    icons[_selectedTab] ?? Icons.inbox_rounded,
                    size: 40,
                    color: AppColors.primary.withOpacity(0.4),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  messages[_selectedTab] ?? 'No orders',
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    color: AppColors.textTertiary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildList(List<OrderItem> orders) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      itemCount: orders.length,
      itemBuilder: (context, index) {
        final order = orders[index];
        return _OrderCard(
          order: order,
          index: index,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => OrderDetailScreen(orderId: order.id),
              ),
            ).then((_) => _fetchOrders());
          },
        );
      },
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderItem order;
  final int index;
  final VoidCallback onTap;

  const _OrderCard({
    required this.order,
    required this.index,
    required this.onTap,
  });

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return AppColors.pending;
      case 'accepted':
        return AppColors.accepted;
      case 'picked_up':
        return AppColors.pickedUp;
      case 'delivered':
        return AppColors.delivered;
      case 'cancelled':
        return AppColors.cancelled;
      default:
        return AppColors.textTertiary;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'New';
      case 'accepted':
        return 'Accepted';
      case 'picked_up':
        return 'Picked Up';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.schedule_rounded;
      case 'accepted':
        return Icons.check_circle_outline_rounded;
      case 'picked_up':
        return Icons.delivery_dining_rounded;
      case 'delivered':
        return Icons.check_circle_rounded;
      case 'cancelled':
        return Icons.cancel_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(order.status);
    final dateStr = order.createdAt.isNotEmpty
        ? DateFormat('dd MMM, hh:mm a')
            .format(DateTime.parse(order.createdAt))
        : '';
    final itemsPreview = order.items.isNotEmpty
        ? order.items
            .take(2)
            .map((e) => e is Map ? e['name']?.toString() ?? 'Item' : 'Item')
            .join(', ')
        : null;
    final hasMoreItems = order.items.length > 2;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: IntrinsicHeight(
            child: Row(
              children: [
                Container(
                  width: 5,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(18),
                      bottomLeft: Radius.circular(18),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(_statusIcon(order.status),
                                  size: 18, color: color),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Order #${order.id}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  if (order.customerName != null ||
                                      order.customerPhone != null)
                                    Text(
                                      order.customerName ??
                                          order.customerPhone ??
                                          '',
                                      style: GoogleFonts.poppins(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                _statusLabel(order.status),
                                style: GoogleFonts.poppins(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: color,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 14, color: AppColors.textTertiary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                order.formattedAddress ??
                                    order.address ??
                                    'No address',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            if (itemsPreview != null)
                              Expanded(
                                child: Row(
                                  children: [
                                    const Icon(Icons.receipt_outlined,
                                        size: 13, color: AppColors.textTertiary),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        itemsPreview +
                                            (hasMoreItems ? ' & more' : ''),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.poppins(
                                          fontSize: 11,
                                          color: AppColors.textTertiary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            const Spacer(),
                            if (order.distanceFromBranch != null)
                              Padding(
                                padding: const EdgeInsets.only(right: 12),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.near_me_rounded,
                                        size: 13, color: AppColors.primary),
                                    const SizedBox(width: 3),
                                    Text(
                                      '${order.distanceFromBranch!.toStringAsFixed(1)} km',
                                      style: GoogleFonts.poppins(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            Text(
                              '₹${order.total.toStringAsFixed(0)}',
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        if (dateStr.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Row(
                              children: [
                                const Icon(Icons.access_time_rounded,
                                    size: 12, color: AppColors.textTertiary),
                                const SizedBox(width: 4),
                                Text(
                                  dateStr,
                                  style: GoogleFonts.poppins(
                                    fontSize: 11,
                                    color: AppColors.textTertiary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
