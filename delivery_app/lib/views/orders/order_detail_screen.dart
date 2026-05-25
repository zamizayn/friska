import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../main.dart';
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

  static const _statusFlow = ['pending', 'accepted', 'picked_up', 'delivered'];

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
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Status updated to ${status.replaceAll('_', ' ')}',
            style: GoogleFonts.poppins(),
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update status'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _openMap() async {
    if (_order == null) return;
    final lat = _order!['deliveryLatitude'];
    final lng = _order!['deliveryLongitude'];

    Uri? uri;
    if (lat != null && lng != null) {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    } else {
      final address = _order!['formattedAddress'] ?? _order!['address'];
      if (address != null && address.toString().startsWith('http')) {
        uri = Uri.parse(address);
      }
    }

    if (uri == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('No location data available', style: GoogleFonts.poppins()),
            backgroundColor: AppColors.warning,
          ),
        );
      }
      return;
    }

    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open maps: $e', style: GoogleFonts.poppins()),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _callCustomer() async {
    final phone = _order?['customer']?['phone'];
    if (phone == null) return;
    final uri = Uri.parse('tel:$phone');

    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not make a call', style: GoogleFonts.poppins()),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${widget.orderId}'),
        actions: [
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
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Icon(Icons.search_off_rounded,
                size: 32, color: AppColors.warning),
          ),
          const SizedBox(height: 20),
          Text(
            'Order not found',
            style: GoogleFonts.poppins(
              fontSize: 16,
              color: AppColors.textTertiary,
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

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      children: [
        _buildStatusTimeline(status, o),
        const SizedBox(height: 20),
        _buildCustomerCard(o),
        const SizedBox(height: 12),
        _buildAddressCard(o),
        const SizedBox(height: 12),
        if (o['items'] != null && (o['items'] as List).isNotEmpty)
          _buildItemsCard(o['items'] as List),
        const SizedBox(height: 12),
        _buildPaymentCard(o),
        const SizedBox(height: 24),
        _buildActionButtons(status),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildStatusTimeline(String status, Map<String, dynamic> o) {
    final currentIdx = _statusFlow.indexOf(status);
    final isCancelled = status == 'cancelled';
    final dateStr = o['createdAt'] != null
        ? DateFormat('dd MMM yyyy, hh:mm a')
            .format(DateTime.parse(o['createdAt']))
        : '';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _statusColor(status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Icon(
                    isCancelled
                        ? Icons.cancel_rounded
                        : currentIdx >= 3
                            ? Icons.check_circle_rounded
                            : Icons.schedule_rounded,
                    size: 24,
                    color: _statusColor(status),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isCancelled ? 'Cancelled' : _statusLabel(status),
                      style: GoogleFonts.poppins(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: _statusColor(status),
                      ),
                    ),
                    if (dateStr.isNotEmpty)
                      Text(
                        dateStr,
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: AppColors.textTertiary,
                        ),
                      ),
                  ],
                ),
              ),
              if (o['distanceFromBranch'] != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        (o['distanceFromBranch'] as num).toStringAsFixed(1),
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      Text(
                        'km',
                        style: GoogleFonts.poppins(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (!isCancelled) ...[
            const SizedBox(height: 20),
            _buildStepper(currentIdx),
          ],
        ],
      ),
    );
  }

  Widget _buildStepper(int currentIdx) {
    final stepLabels = ['New', 'Accepted', 'Picked Up', 'Delivered'];
    final stepIcons = [
      Icons.schedule_rounded,
      Icons.check_circle_outline_rounded,
      Icons.delivery_dining_rounded,
      Icons.check_circle_rounded,
    ];

    return Column(
      children: [
        Row(
          children: List.generate(stepLabels.length, (i) {
            final isCompleted = i <= currentIdx && currentIdx >= 0;
            return Expanded(
              child: Column(
                children: [
                  Row(
                    children: [
                      if (i > 0)
                        Expanded(
                          child: Container(
                            height: 3,
                            color: isCompleted
                                ? _statusColor(_statusFlow[i])
                                : AppColors.border,
                          ),
                        ),
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isCompleted
                              ? _statusColor(_statusFlow[i])
                              : AppColors.border.withOpacity(0.5),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: isCompleted
                              ? (i == currentIdx
                                  ? Icon(stepIcons[i],
                                      size: 16, color: Colors.white)
                                  : const Icon(Icons.check_rounded,
                                      size: 16, color: Colors.white))
                              : Icon(stepIcons[i],
                                  size: 16,
                                  color: AppColors.textTertiary),
                        ),
                      ),
                      if (i < stepLabels.length - 1)
                        Expanded(
                          child: Container(
                            height: 3,
                            color: isCompleted
                                ? _statusColor(_statusFlow[i])
                                : AppColors.border,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    stepLabels[i],
                    style: GoogleFonts.poppins(
                      fontSize: 10,
                      fontWeight:
                          i == currentIdx ? FontWeight.w600 : FontWeight.w500,
                      color: i == currentIdx
                          ? _statusColor(_statusFlow[i])
                          : AppColors.textTertiary,
                    ),
                  ),
                ],
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildCustomerCard(Map<String, dynamic> o) {
    final customer = o['customer'];
    final name = customer?['name'] ?? 'N/A';
    final phone = customer?['phone'] ?? '';
    final initials = name != 'N/A' && name.isNotEmpty
        ? name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
        : '?';

    return _sectionCard(
      [
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withOpacity(0.8),
                    AppColors.primaryDark,
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Customer',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textTertiary,
                        letterSpacing: 0.5,
                      )),
                  const SizedBox(height: 2),
                  Text(
                    name,
                    style: GoogleFonts.poppins(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (phone.isNotEmpty)
                    Text(
                      phone,
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
            if (phone.isNotEmpty)
              Container(
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: IconButton(
                  icon: const Icon(Icons.phone_rounded,
                      size: 22, color: AppColors.success),
                  onPressed: _callCustomer,
                ),
              ),
          ],
        ),
      ],
      showTitle: false,
    );
  }

  Widget _buildAddressCard(Map<String, dynamic> o) {
    final address = o['formattedAddress'] ?? o['address'] ?? 'N/A';
    final rawAddress = o['address'];

    return _sectionCard(
      [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.info.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.location_on_rounded,
                  size: 22, color: AppColors.info),
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
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (rawAddress != null && rawAddress != address)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        rawAddress,
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
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
              foregroundColor: AppColors.info,
              side: BorderSide(color: AppColors.info.withOpacity(0.3)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
      ],
      title: 'Delivery Address',
    );
  }

  Widget _buildItemsCard(List items) {
    return _sectionCard(
      items.asMap().entries.map<Widget>((entry) {
        final item = entry.value;
        final isLast = entry.key == items.length - 1;
        final qty = item['quantity'] ?? 1;
        final price = item['price'] ?? 0;
        final name = item['name'] ?? 'Item';
        return Column(
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.border.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      '${qty}x',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    name,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  '₹${(price * qty).toStringAsFixed(0)}',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            if (!isLast) const SizedBox(height: 12),
          ],
        );
      }).toList(),
      title: 'Items (${items.length})',
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> o) {
    return _sectionCard(
      [
        _paymentRow('Method', o['paymentMethod'] ?? 'N/A'),
        const SizedBox(height: 10),
        _paymentRow('Payment Status', o['paymentStatus'] ?? 'N/A'),
        const Divider(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Total',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              '₹${(o['total'] ?? 0).toStringAsFixed(0)}',
              style: GoogleFonts.poppins(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        if ((o['discountAmount'] ?? 0) > 0) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.discount_rounded,
                  size: 16, color: AppColors.success),
              const SizedBox(width: 6),
              Text(
                'Discount',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),
              Text(
                '-₹${(o['discountAmount'] ?? 0).toStringAsFixed(0)}',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.success,
                ),
              ),
            ],
          ),
        ],
        if (o['appliedOfferCode'] != null) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.local_offer_rounded,
                    size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  'Offer: ${o['appliedOfferCode']}',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
      title: 'Payment',
    );
  }

  Widget _paymentRow(String label, String value) {
    return Row(
      children: [
        const Icon(Icons.circle_rounded, size: 6, color: AppColors.textTertiary),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: GoogleFonts.poppins(
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _sectionCard(List<Widget> children, {String? title, bool showTitle = true}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null && showTitle) ...[
            Text(
              title,
              style: GoogleFonts.poppins(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textTertiary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),
          ],
          ...children,
        ],
      ),
    );
  }

  Widget _buildActionButtons(String status) {
    if (status == 'cancelled' || status == 'delivered') {
      return const SizedBox.shrink();
    }

    final List<Widget> buttons = [];

    if (status == 'pending') {
      buttons.add(_actionButton(
        'Accept Order',
        Icons.check_circle_rounded,
        AppColors.success,
        () => _updateStatus('accepted'),
        'Start preparing for delivery',
      ));
    }

    if (status == 'accepted') {
      buttons.add(_actionButton(
        'Mark as Picked Up',
        Icons.delivery_dining_rounded,
        AppColors.pickedUp,
        () => _updateStatus('picked_up'),
        'Order collected from store',
      ));
      buttons.add(const SizedBox(height: 10));
      buttons.add(_actionButton(
        'Cancel Order',
        Icons.cancel_rounded,
        AppColors.cancelled,
        () => _updateStatus('cancelled'),
        'This cannot be undone',
        outlined: true,
      ));
    }

    if (status == 'picked_up') {
      buttons.add(_actionButton(
        'Mark as Delivered',
        Icons.check_circle_rounded,
        AppColors.success,
        () => _updateStatus('delivered'),
        'Confirm customer received the order',
      ));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Actions',
          style: GoogleFonts.poppins(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.textTertiary,
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
    VoidCallback onPressed,
    String description, {
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
                    : Icon(icon, size: 24, color: outlined ? color : Colors.white),
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
