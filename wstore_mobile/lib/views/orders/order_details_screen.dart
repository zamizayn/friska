import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../widgets/glass_scaffold.dart';
import '../../providers/orders_provider.dart';

class OrderDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> order;

  const OrderDetailsScreen({super.key, required this.order});

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  final currencyFormat =
      NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);
  late Map<String, dynamic> _currentOrder;

  @override
  void initState() {
    super.initState();
    _currentOrder = Map<String, dynamic>.from(widget.order);
  }

  Future<void> _launchWhatsApp(String text) async {
    final urlString = 'https://wa.me/?text=${Uri.encodeComponent(text)}';
    final uri = Uri.parse(urlString);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _forwardToDelivery() {
    final orderId = _currentOrder['id'];
    final customerName = _currentOrder['customerName'] ??
        _currentOrder['customer']?['name'] ??
        'Client';
    final customerPhone = _currentOrder['customerPhone'] ?? 'N/A';
    final address = _currentOrder['address'] ?? 'N/A';

    final text = '🚚 *New Delivery Assignment*\n\n'
        '*Order ID:* #$orderId\n'
        '*Customer:* $customerName\n'
        '*Phone:* $customerPhone\n'
        '*Address:* $address\n\n'
        '*Please deliver as soon as possible!* 🛵';

    _launchWhatsApp(text);
  }

  void _showStatusUpdateSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                border: Border(
                    top: BorderSide(color: AppColors.cardBorder)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Update Order Status',
                    style: const TextStyle(
                        fontFamily: 'Outfit',
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    title: const Text('Pending',
                        style: TextStyle(color: AppColors.textPrimary)),
                    onTap: () {
                      Navigator.pop(context);
                      _updateStatus('pending');
                    },
                  ),
                  ListTile(
                    title: const Text('Shipped',
                        style: TextStyle(color: AppColors.textPrimary)),
                    onTap: () {
                      Navigator.pop(context);
                      _updateStatus('shipped');
                    },
                  ),
                  ListTile(
                    title: const Text('Delivered',
                        style: TextStyle(color: AppColors.textPrimary)),
                    onTap: () {
                      Navigator.pop(context);
                      _updateStatus('delivered');
                    },
                  ),
                  ListTile(
                    title: const Text('Cancelled',
                        style: TextStyle(color: AppColors.red)),
                    onTap: () {
                      Navigator.pop(context);
                      _showCancellationReasonDialog();
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showCancellationReasonDialog() {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.cardBg.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Reason for Cancellation',
                        style: const TextStyle(
                            fontFamily: 'Outfit',
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 18)),
                    const SizedBox(height: 16),
                    GlassInput(
                      controller: reasonController,
                      hint: 'Enter reason...',
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel',
                              style:
                                  TextStyle(color: AppColors.textPrimary54)),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () {
                            if (reasonController.text.trim().isEmpty) return;
                            Navigator.pop(context);
                            _updateStatus('cancelled',
                                cancellationReason:
                                    reasonController.text.trim());
                          },
                          child: const Text('Confirm',
                              style: TextStyle(color: AppColors.red)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _updateStatus(String status,
      {String? cancellationReason}) async {
    setState(() {
      _currentOrder['status'] = status;
      if (cancellationReason != null) {
        _currentOrder['cancellationReason'] = cancellationReason;
      }
    });

    final orderId = _currentOrder['id'];
    await context.read<OrdersProvider>().updateOrderStatus(
          orderId,
          status,
          cancellationReason: cancellationReason,
        );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Order Status updated to $status'),
            backgroundColor: AppColors.green),
      );
    }
  }

  void _showPaymentUpdateSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                border: Border(
                    top: BorderSide(color: AppColors.cardBorder)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Update Payment Status',
                    style: const TextStyle(
                        fontFamily: 'Outfit',
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    title: const Text('Unpaid',
                        style: TextStyle(color: AppColors.textPrimary)),
                    onTap: () {
                      Navigator.pop(context);
                      _updatePayment('unpaid');
                    },
                  ),
                  ListTile(
                    title: const Text('Paid',
                        style: TextStyle(color: AppColors.green)),
                    onTap: () {
                      Navigator.pop(context);
                      _updatePayment('paid');
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _updatePayment(String status) async {
    setState(() {
      _currentOrder['paymentStatus'] = status;
    });

    final orderId = _currentOrder['id'];
    await context
        .read<OrdersProvider>()
        .updatePaymentStatus(orderId, status);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Payment Status updated to $status'),
            backgroundColor: AppColors.green),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderId = _currentOrder['id'] ?? 0;
    final customerName = _currentOrder['customerName'] ??
        _currentOrder['customer']?['name'] ??
        'N/A';
    final customerPhone = _currentOrder['customerPhone'] ?? 'N/A';
    final address = _currentOrder['address'] ?? 'N/A';
    final paymentMethod = _currentOrder['paymentMethod'] ?? 'COD';
    final paymentStatus = _currentOrder['paymentStatus'] ?? 'unpaid';
    final orderStatus = _currentOrder['status'] ?? 'pending';
    final totalAmount =
        double.tryParse(_currentOrder['total']?.toString() ?? '0') ?? 0.0;
    final items = _currentOrder['items'] as List<dynamic>? ?? [];

    final statusColor = orderStatus.toString().statusColor;
    final isPaid = paymentStatus.toLowerCase() == 'paid';

    return GlassScaffold(
      title: 'Order Details #$orderId',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Summary Row
            GlassCard(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ORDER STATUS',
                        style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 6),
                      GestureDetector(
                        onTap: _showStatusUpdateSheet,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                orderStatus.toUpperCase(),
                                style: TextStyle(
                                    fontFamily: 'Outfit',
                                    color: statusColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12),
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.edit, color: statusColor, size: 12),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'PAYMENT STATUS',
                        style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 6),
                      GestureDetector(
                        onTap: _showPaymentUpdateSheet,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isPaid
                                ? AppColors.green.withOpacity(0.12)
                                : AppColors.red.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                paymentStatus.toUpperCase(),
                                style: TextStyle(
                                  fontFamily: 'Outfit',
                                  color: isPaid
                                      ? AppColors.green
                                      : AppColors.red,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.edit,
                                  color: isPaid
                                      ? AppColors.green
                                      : AppColors.red,
                                  size: 12),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (_currentOrder['cancellationReason'] != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.red.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppColors.red.withOpacity(0.1)),
                ),
                child: Text(
                  'Cancellation Reason: ${_currentOrder['cancellationReason']}',
                  style: const TextStyle(
                      fontFamily: 'Inter',
                      color: AppColors.red,
                      fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Client Info Card
            const Text('Customer Information',
                style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(customerName,
                          style: const TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary)),
                      IconButton(
                        icon: const Icon(Icons.call, color: AppColors.accent),
                        onPressed: () =>
                            launchUrl(Uri.parse('tel:$customerPhone')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Phone: $customerPhone',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 12),
                  const Divider(color: AppColors.textPrimary10),
                  const SizedBox(height: 12),
                  Text('DELIVERY ADDRESS',
                      style: const TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textMuted)),
                  const SizedBox(height: 6),
                  Text(address,
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          height: 1.5)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Items Summary
            const Text('Itemized Bill',
                style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            GlassCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: items.length,
                    separatorBuilder: (_, __) =>
                        const Divider(color: AppColors.textPrimary10, height: 1),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final name =
                          item['name'] ?? item['product']?['name'] ?? 'Product';
                      final qty =
                          int.tryParse(item['quantity']?.toString() ?? '1') ??
                              1;
                      final price = double.tryParse(
                                  item['price']?.toString() ?? '0') ??
                              0.0;
                      return ListTile(
                        title: Text(name,
                            style: const TextStyle(
                                fontFamily: 'Outfit',
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 14)),
                        subtitle: Text(
                            '$qty x ${currencyFormat.format(price)}',
                            style: const TextStyle(
                                color: AppColors.textMuted, fontSize: 12)),
                        trailing: Text(
                          currencyFormat.format(qty * price),
                          style: const TextStyle(
                              fontFamily: 'Outfit',
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14),
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
                        Expanded(
                          child: Text(
                            'Payment Method: $paymentMethod',
                            style: const TextStyle(
                                color: AppColors.textMuted, fontSize: 13),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('Grand Total: ',
                                style: TextStyle(
                                    fontFamily: 'Outfit',
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14)),
                            Text(
                              currencyFormat.format(totalAmount),
                              style: const TextStyle(
                                  fontFamily: 'Outfit',
                                  color: AppColors.accent,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Courier forwarding action
            GlassButton(
              label: 'Assign Delivery via WhatsApp',
              onPressed: _forwardToDelivery,
              icon: Icons.share,
              primary: false,
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
