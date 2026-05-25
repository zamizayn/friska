import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../services/api_client.dart';
import '../../providers/orders_provider.dart';

class OrderDetailScreen extends StatefulWidget {
  final int orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _loading = true;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _fetchOrder();
  }

  Future<void> _fetchOrder() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.get(ApiConfig.orderDetail(widget.orderId));
      if (res.statusCode == 200) {
        setState(() => _order = jsonDecode(res.body));
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _updating = true);
    final prov = context.read<OrdersProvider>();
    final success = await prov.updateStatus(widget.orderId, status);
    setState(() => _updating = false);

    if (!mounted) return;

    if (success) {
      await _fetchOrder();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Status updated to ${status.replaceAll('_', ' ')}',
            style: GoogleFonts.poppins(),
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to update status'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  Future<void> _openMap() async {
    if (_order == null) return;
    final lat = _order!['deliveryLatitude'];
    final lng = _order!['deliveryLongitude'];

    if (lat != null && lng != null) {
      final url = 'https://maps.google.com/?q=$lat,$lng';
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } else {
      final address = _order!['formattedAddress'] ?? _order!['address'];
      if (address != null && address.toString().startsWith('http')) {
        final uri = Uri.parse(address);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }
    }
  }

  Future<void> _callCustomer() async {
    final phone = _order?['customer']?['phone'];
    if (phone == null) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return const Color(0xFFF97316);
      case 'accepted':
        return const Color(0xFF3B82F6);
      case 'picked_up':
        return const Color(0xFF8B5CF6);
      case 'delivered':
        return const Color(0xFF10B981);
      case 'cancelled':
        return const Color(0xFFEF4444);
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'New Order';
      case 'accepted':
        return 'Accepted';
      case 'picked_up':
        return 'Picked Up';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.replaceAll('_', ' ');
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.schedule;
      case 'accepted':
        return Icons.check_circle_outline;
      case 'picked_up':
        return Icons.delivery_dining;
      case 'delivered':
        return Icons.check_circle;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Order #${widget.orderId}',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 18),
        ),
        backgroundColor: const Color(0xFFF97316),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_order != null)
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _fetchOrder,
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? _buildNotFound()
              : _buildContent(),
    );
  }

  Widget _buildNotFound() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(Icons.search_off_rounded,
                size: 40, color: Colors.orange.shade300),
          ),
          const SizedBox(height: 20),
          Text(
            'Order not found',
            style: GoogleFonts.poppins(
              fontSize: 16,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final o = _order!;
    final status = o['status'] ?? 'pending';
    final dateStr = o['createdAt'] != null
        ? DateFormat('dd MMMM yyyy, hh:mm a')
            .format(DateTime.parse(o['createdAt']))
        : '';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _buildStatusHeader(status, dateStr, o),
        const SizedBox(height: 20),
        _buildCustomerCard(o),
        const SizedBox(height: 16),
        _buildAddressCard(o),
        if (o['items'] != null && (o['items'] as List).isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildItemsCard(o),
        ],
        const SizedBox(height: 16),
        _buildPaymentCard(o),
        const SizedBox(height: 24),
        _buildActionButtons(status),
      ],
    );
  }

  Widget _buildStatusHeader(String status, String dateStr, Map<String, dynamic> o) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _statusColor(status).withOpacity(0.1),
            _statusColor(status).withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _statusColor(status).withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: _statusColor(status).withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              _statusIcon(status),
              size: 28,
              color: _statusColor(status),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _statusLabel(status),
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: _statusColor(status),
                  ),
                ),
                if (dateStr.isNotEmpty)
                  Text(
                    dateStr,
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                    ),
                  ),
              ],
            ),
          ),
          if (o['distanceFromBranch'] != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: _statusColor('pending').withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    '${(o['distanceFromBranch'] as num).toStringAsFixed(1)}',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFFF97316),
                    ),
                  ),
                  Text(
                    'km',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFFF97316),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCustomerCard(Map<String, dynamic> o) {
    final customer = o['customer'];
    return _sectionCard(
      'Customer',
      [
        if (customer != null) ...[
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFF97316).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.person_rounded,
                    size: 22, color: Color(0xFFF97316)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer['name'] ?? 'N/A',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      customer['phone'] ?? '',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              if (customer['phone'] != null)
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.phone_rounded,
                        size: 20, color: Color(0xFF10B981)),
                    onPressed: _callCustomer,
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildAddressCard(Map<String, dynamic> o) {
    final address = o['formattedAddress'] ?? o['address'] ?? 'N/A';
    final rawAddress = o['address'];

    return _sectionCard(
      'Delivery Address',
      [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFF3B82F6).withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.location_on_rounded,
                  size: 22, color: Color(0xFF3B82F6)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    address,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (rawAddress != null && rawAddress != address)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        rawAddress,
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _openMap,
            icon: const Icon(Icons.map_outlined, size: 18),
            label: Text(
              'Open in Maps',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF3B82F6),
              side: BorderSide(color: const Color(0xFF3B82F6).withOpacity(0.3)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildItemsCard(Map<String, dynamic> o) {
    final items = o['items'] as List;
    return _sectionCard(
      'Items (${items.length})',
      items.asMap().entries.map<Widget>((entry) {
        final item = entry.value;
        final isLast = entry.key == items.length - 1;
        return Column(
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      '${item['quantity'] ?? 1}x',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item['name'] ?? 'Item',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Text(
                  '₹${((item['price'] ?? 0) * (item['quantity'] ?? 1)).toStringAsFixed(0)}',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            if (!isLast) const SizedBox(height: 12),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> o) {
    return _sectionCard(
      'Payment',
      [
        _paymentRow('Method', o['paymentMethod'] ?? 'N/A', Icons.payment),
        const SizedBox(height: 10),
        _paymentRow('Status', o['paymentStatus'] ?? 'N/A', Icons.account_balance_wallet),
        const Divider(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Total',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade800,
              ),
            ),
            Text(
              '₹${(o['total'] ?? 0).toStringAsFixed(0)}',
              style: GoogleFonts.poppins(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Colors.grey.shade900,
              ),
            ),
          ],
        ),
        if ((o['discountAmount'] ?? 0) > 0) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.discount, size: 14, color: const Color(0xFF10B981)),
              const SizedBox(width: 6),
              Text(
                'Discount',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
              const Spacer(),
              Text(
                '-₹${(o['discountAmount'] ?? 0).toStringAsFixed(0)}',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF10B981),
                ),
              ),
            ],
          ),
        ],
        if (o['appliedOfferCode'] != null) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF97316).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Offer: ${o['appliedOfferCode']}',
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFFF97316),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _paymentRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade400),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: GoogleFonts.poppins(
            fontSize: 13,
            color: Colors.grey.shade600,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _sectionCard(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Colors.grey.shade500,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildActionButtons(String status) {
    final List<Widget> buttons = [];

    if (status == 'pending') {
      buttons.add(_actionButton(
        'Accept Order',
        Icons.check_circle_rounded,
        const Color(0xFF10B981),
        () => _updateStatus('accepted'),
        description: 'Start preparing for delivery',
      ));
    }

    if (status == 'accepted') {
      buttons.add(_actionButton(
        'Mark as Picked Up',
        Icons.delivery_dining_rounded,
        const Color(0xFF8B5CF6),
        () => _updateStatus('picked_up'),
        description: 'Order has been collected from store',
      ));
      buttons.add(const SizedBox(height: 10));
      buttons.add(_actionButton(
        'Cancel Order',
        Icons.cancel_rounded,
        const Color(0xFFEF4444),
        () => _updateStatus('cancelled'),
        description: 'This cannot be undone',
        outlined: true,
      ));
    }

    if (status == 'picked_up') {
      buttons.add(_actionButton(
        'Mark as Delivered',
        Icons.check_circle_rounded,
        const Color(0xFF10B981),
        () => _updateStatus('delivered'),
        description: 'Confirm customer received the order',
      ));
    }

    if (buttons.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Actions',
          style: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Colors.grey.shade500,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 12),
        ...buttons,
      ],
    );
  }

  Widget _actionButton(
    String label,
    IconData icon,
    Color color,
    VoidCallback onPressed, {
    String? description,
    bool outlined = false,
  }) {
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: outlined ? Colors.transparent : color,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: _updating ? null : onPressed,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: outlined
                  ? Border.all(color: color.withOpacity(0.3))
                  : null,
              color: outlined ? color.withOpacity(0.05) : null,
            ),
            child: Row(
              children: [
                _updating
                    ? SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: outlined ? color : Colors.white,
                        ),
                      )
                    : Icon(icon,
                        size: 24,
                        color: outlined ? color : Colors.white),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: outlined ? color : Colors.white,
                        ),
                      ),
                      if (description != null)
                        Text(
                          description,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            color: outlined
                                ? color.withOpacity(0.7)
                                : Colors.white70,
                          ),
                        ),
                    ],
                  ),
                ),
                if (!_updating)
                  Icon(Icons.chevron_right_rounded,
                      size: 20,
                      color: outlined
                          ? color.withOpacity(0.5)
                          : Colors.white60),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
