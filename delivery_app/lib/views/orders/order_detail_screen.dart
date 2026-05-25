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
          content: Text('Status updated to ${status.replaceAll('_', ' ')}'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update status'),
          backgroundColor: Colors.red,
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

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'accepted':
        return Colors.blue;
      case 'picked_up':
        return Colors.purple;
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    return status.replaceAll('_', ' ').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Order #${widget.orderId}',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.orange.shade600,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? const Center(child: Text('Order not found'))
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final o = _order!;
    final status = o['status'] ?? 'pending';
    final dateStr = o['createdAt'] != null
        ? DateFormat('dd MMMM yyyy, hh:mm a')
            .format(DateTime.parse(o['createdAt']))
        : '';

    List<Widget> actions = [];

    if (status == 'pending') {
      actions.add(_buildActionButton(
        'Accept Order',
        Icons.check_circle,
        Colors.green,
        () => _updateStatus('accepted'),
      ));
    }

    if (status == 'accepted') {
      actions.add(_buildActionButton(
        'Picked Up',
        Icons.delivery_dining,
        Colors.purple,
        () => _updateStatus('picked_up'),
      ));
      actions.add(_buildActionButton(
        'Cancel',
        Icons.cancel,
        Colors.red,
        () => _updateStatus('cancelled'),
      ));
    }

    if (status == 'picked_up') {
      actions.add(_buildActionButton(
        'Mark Delivered',
        Icons.check_circle,
        Colors.green,
        () => _updateStatus('delivered'),
      ));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _statusColor(status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Icon(_statusIcon(status),
                    size: 32, color: _statusColor(status)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _statusLabel(status),
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _statusColor(status),
                        ),
                      ),
                      if (dateStr.isNotEmpty)
                        Text(
                          dateStr,
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                    ],
                  ),
                ),
                if (o['distanceFromBranch'] != null)
                  Text(
                    '${o['distanceFromBranch'].toStringAsFixed(1)} km',
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.orange.shade700,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          _sectionHeader('Customer'),
          _infoCard([
            _infoRow(Icons.person, 'Name',
                o['customer']?['name'] ?? 'N/A'),
            _infoRow(Icons.phone, 'Phone',
                o['customer']?['phone'] ?? 'N/A'),
          ]),

          const SizedBox(height: 16),
          _sectionHeader('Delivery Address'),
          _infoCard([
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                o['formattedAddress'] ?? o['address'] ?? 'N/A',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (o['formattedAddress'] != null && o['address'] != null &&
                o['address'] != o['formattedAddress'])
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  o['address'],
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _openMap,
                icon: const Icon(Icons.map),
                label: const Text('Open in Maps'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.orange.shade700,
                  side: BorderSide(color: Colors.orange.shade300),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ]),

          if (o['items'] != null && (o['items'] as List).isNotEmpty) ...[
            const SizedBox(height: 16),
            _sectionHeader('Items'),
            _infoCard(
              (o['items'] as List).map<Widget>((item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${item['quantity'] ?? 1}x ${item['name'] ?? 'Item'}',
                          style: GoogleFonts.poppins(fontSize: 13),
                        ),
                      ),
                      Text(
                        '₹${((item['price'] ?? 0) * (item['quantity'] ?? 1)).toStringAsFixed(2)}',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],

          const SizedBox(height: 16),
          _sectionHeader('Payment'),
          _infoCard([
            _infoRow(Icons.payment, 'Method',
                o['paymentMethod'] ?? 'N/A'),
            _infoRow(Icons.account_balance_wallet, 'Status',
                o['paymentStatus'] ?? 'N/A'),
            _infoRow(Icons.currency_rupee, 'Total',
                '₹${(o['total'] ?? 0).toStringAsFixed(2)}'),
            if ((o['discountAmount'] ?? 0) > 0)
              _infoRow(Icons.discount, 'Discount',
                  '-₹${(o['discountAmount'] ?? 0).toStringAsFixed(2)}'),
            if (o['appliedOfferCode'] != null)
              _infoRow(Icons.local_offer, 'Offer',
                  o['appliedOfferCode']),
          ]),

          if (actions.isNotEmpty) ...[
            const SizedBox(height: 24),
            ...actions,
          ],

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _infoCard(List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade500),
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
      ),
    );
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

  Widget _buildActionButton(
      String label, IconData icon, Color color, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton.icon(
          onPressed: _updating ? null : onPressed,
          icon: _updating
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(icon),
          label: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ),
    );
  }
}
