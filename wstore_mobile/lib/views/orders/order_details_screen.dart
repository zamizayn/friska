import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
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
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _currentOrder = Map<String, dynamic>.from(widget.order);
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

  Future<void> _launchWhatsApp(String text) async {
    final urlString = 'https://wa.me/?text=${Uri.encodeComponent(text)}';
    final uri = Uri.parse(urlString);
    // if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    // } else {
    //   if (mounted) {
    //     ScaffoldMessenger.of(context).showSnackBar(
    //       const SnackBar(content: Text('Failed to open WhatsApp')),
    //     );
    //   }
    // }
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
                'Update Order Status',
                style: GoogleFonts.outfit(
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
                    style: TextStyle(color: Color(0xFFEF4444))),
                onTap: () {
                  Navigator.pop(context);
                  _showCancellationReasonDialog();
                },
              ),
            ],
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
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Reason for Cancellation',
              style: GoogleFonts.outfit(color: AppColors.textPrimary)),
          content: TextField(
            controller: reasonController,
            style:
                GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Enter reason...',
              hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
              filled: true,
              fillColor: AppColors.inputBg,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border)),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel',
                  style: TextStyle(color: AppColors.textPrimary54)),
            ),
            TextButton(
              onPressed: () {
                if (reasonController.text.trim().isEmpty) return;
                Navigator.pop(context);
                _updateStatus('cancelled',
                    cancellationReason: reasonController.text.trim());
              },
              child: const Text('Confirm',
                  style: TextStyle(color: Color(0xFFEF4444))),
            ),
          ],
        );
      },
    );
  }

  Future<void> _updateStatus(String status,
      {String? cancellationReason}) async {
    final oldStatus = _currentOrder['status'];
    final oldReason = _currentOrder['cancellationReason'];

    // Optimistically update UI immediately
    setState(() {
      _currentOrder['status'] = status;
      if (cancellationReason != null) {
        _currentOrder['cancellationReason'] = cancellationReason;
      }
    });

    final orderId = _currentOrder['id'];
    final success = await context.read<OrdersProvider>().updateOrderStatus(
          orderId,
          status,
          cancellationReason: cancellationReason,
        );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Order Status updated to $status'),
            backgroundColor: const Color(0xFF10B981)),
      );
    }
  }

  void _showPaymentUpdateSheet() {
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
                'Update Payment Status',
                style: GoogleFonts.outfit(
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
                    style: TextStyle(color: Color(0xFF10B981))),
                onTap: () {
                  Navigator.pop(context);
                  _updatePayment('paid');
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _updatePayment(String status) async {
    final oldStatus = _currentOrder['paymentStatus'];

    // Optimistically update UI immediately
    setState(() {
      _currentOrder['paymentStatus'] = status;
    });

    final orderId = _currentOrder['id'];
    final success = await context
        .read<OrdersProvider>()
        .updatePaymentStatus(orderId, status);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Payment Status updated to $status'),
            backgroundColor: const Color(0xFF10B981)),
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

    final statusColor = _getStatusColor(orderStatus);
    final isPaid = paymentStatus.toLowerCase() == 'paid';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Order Details #$orderId',
            style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Summary Row
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ORDER STATUS',
                        style: GoogleFonts.outfit(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF64748B)),
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
                                style: GoogleFonts.outfit(
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
                        style: GoogleFonts.outfit(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 6),
                      GestureDetector(
                        onTap: _showPaymentUpdateSheet,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isPaid
                                ? const Color(0xFF10B981).withOpacity(0.12)
                                : const Color(0xFFEF4444).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                paymentStatus.toUpperCase(),
                                style: GoogleFonts.outfit(
                                  color: isPaid
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFFEF4444),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.edit,
                                  color: isPaid
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFFEF4444),
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
                  color: const Color(0xFFEF4444).withOpacity(0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: const Color(0xFFEF4444).withOpacity(0.1)),
                ),
                child: Text(
                  'Cancellation Reason: ${_currentOrder['cancellationReason']}',
                  style: GoogleFonts.inter(
                      color: const Color(0xFFFCA5A5), fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Client Info Card
            Text('Customer Information',
                style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(customerName,
                          style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary)),
                      IconButton(
                        icon: const Icon(Icons.call, color: Color(0xFF6366F1)),
                        onPressed: () =>
                            launchUrl(Uri.parse('tel:$customerPhone')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Phone: $customerPhone',
                      style: GoogleFonts.inter(
                          color: const Color(0xFF94A3B8), fontSize: 13)),
                  const SizedBox(height: 12),
                  const Divider(color: AppColors.textPrimary10),
                  const SizedBox(height: 12),
                  Text('DELIVERY ADDRESS',
                      style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF64748B))),
                  const SizedBox(height: 6),
                  Text(address,
                      style: GoogleFonts.inter(
                          color: const Color(0xFFE2E8F0),
                          fontSize: 13,
                          height: 1.5)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Items Summary
            Text('Itemized Bill',
                style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const Divider(
                        color: AppColors.textPrimary10, height: 1),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final name =
                          item['name'] ?? item['product']?['name'] ?? 'Product';
                      final qty =
                          int.tryParse(item['quantity']?.toString() ?? '1') ??
                              1;
                      final price =
                          double.tryParse(item['price']?.toString() ?? '0') ??
                              0.0;
                      return ListTile(
                        title: Text(name,
                            style: GoogleFonts.outfit(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 14)),
                        subtitle: Text('$qty x ${currencyFormat.format(price)}',
                            style: GoogleFonts.inter(
                                color: const Color(0xFF64748B), fontSize: 12)),
                        trailing: Text(
                          currencyFormat.format(qty * price),
                          style: GoogleFonts.outfit(
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
                            style: GoogleFonts.inter(
                                color: const Color(0xFF64748B), fontSize: 13),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Grand Total: ',
                                style: GoogleFonts.outfit(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14)),
                            Text(
                              currencyFormat.format(totalAmount),
                              style: GoogleFonts.outfit(
                                  color: const Color(0xFF6366F1),
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
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: const LinearGradient(
                    colors: [Color(0xFF25D366), Color(0xFF128C7E)]),
              ),
              child: ElevatedButton(
                onPressed: _forwardToDelivery,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.share,
                        color: AppColors.textPrimary, size: 20),
                    const SizedBox(width: 10),
                    Text(
                      'Assign Delivery via WhatsApp',
                      style: GoogleFonts.outfit(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
