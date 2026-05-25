import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../widgets/glass_scaffold.dart';
import '../../services/api_client.dart';
import '../../config/api_config.dart';
import '../../providers/customers_provider.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _searchController = TextEditingController();
  final List<String> _selectedPhones = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CustomersProvider>().fetchCustomers();
    });
    _searchController.addListener(() {
      _onSearchChanged(_searchController.text);
    });
  }

  void _onSearchChanged(String query) {
    context.read<CustomersProvider>().fetchCustomers(search: query);
  }

  void _toggleSelectCustomer(String phone) {
    setState(() {
      if (_selectedPhones.contains(phone)) {
        _selectedPhones.remove(phone);
      } else {
        _selectedPhones.add(phone);
      }
    });
  }

  void _toggleSelectAll(List<dynamic> customers) {
    setState(() {
      if (_selectedPhones.length == customers.length) {
        _selectedPhones.clear();
      } else {
        _selectedPhones.clear();
        for (var c in customers) {
          final phone = c['phone']?.toString();
          if (phone != null) {
            _selectedPhones.add(phone);
          }
        }
      }
    });
  }

  void _showBroadcastCampaignSheet() {
    final msgController = TextEditingController();
    bool isSending = false;
    String error = "";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> submit() async {
              if (msgController.text.trim().isEmpty) {
                setSheetState(() => error = "Please write a campaign message");
                return;
              }

              setSheetState(() {
                isSending = true;
                error = "";
              });

              final success = await context
                  .read<CustomersProvider>()
                  .sendBroadcast(
                    message: msgController.text.trim(),
                    targetPhoneNumbers: _selectedPhones,
                  );

              if (success && mounted) {
                Navigator.pop(context);
                setState(() => _selectedPhones.clear());
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text(
                          'WhatsApp Broadcast Campaign dispatched!'),
                      backgroundColor: AppColors.green),
                );
              } else {
                setSheetState(() {
                  isSending = false;
                  error = "Broadcast dispatch failed. Verify settings.";
                });
              }
            }

            return ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  decoration: const BoxDecoration(
                    color: AppColors.cardBg,
                    border: Border(
                        top: BorderSide(color: AppColors.cardBorder)),
                  ),
                  child: Padding(
                    padding: EdgeInsets.only(
                      left: 24.0,
                      right: 24.0,
                      top: 24.0,
                      bottom:
                          MediaQuery.of(context).viewInsets.bottom + 24.0,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment:
                              MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'WhatsApp Broadcast',
                              style: TextStyle(
                                  fontFamily: 'Outfit',
                                  color: AppColors.textPrimary,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                  color:
                                      AppColors.accent.withOpacity(0.12),
                                  borderRadius:
                                      BorderRadius.circular(20)),
                              child: Text(
                                '${_selectedPhones.length} Selected',
                                style: const TextStyle(
                                    fontFamily: 'Outfit',
                                    color: AppColors.accentLight,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        GlassInput(
                          controller: msgController,
                          hint:
                              'Type your promotional coupon details, discount updates here...',
                          maxLines: 4,
                        ),
                        if (error.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(error,
                              style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontSize: 12)),
                        ],
                        const SizedBox(height: 20),
                        GlassButton(
                          label: 'Shoot Broadcast Campaign 🚀',
                          onPressed: isSending ? null : submit,
                          isLoading: isSending,
                          primary: false,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showCustomerOrders(BuildContext context, String phone) {
    final currencyFormat =
        NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);
    showDialog(
      context: context,
      builder: (ctx) {
        return Consumer<CustomersProvider>(
          builder: (context, _, child) {
            return FutureBuilder(
              future: ApiClient.get(ApiConfig.customerOrders(phone)),
              builder: (context, snapshot) {
                List<dynamic> orders = [];
                bool loading =
                    snapshot.connectionState != ConnectionState.done;
                if (snapshot.hasData &&
                    snapshot.data!.statusCode == 200) {
                  final data = jsonDecode(snapshot.data!.body);
                  orders = data['data'] ?? data ?? [];
                }
                return Dialog(
                  backgroundColor: Colors.transparent,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.cardBg.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: AppColors.cardBorder),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment:
                              CrossAxisAlignment.stretch,
                          children: [
                            const Text('Order History',
                                style: TextStyle(
                                    fontFamily: 'Outfit',
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18)),
                            const SizedBox(height: 16),
                            SizedBox(
                              height: 300,
                              child: loading
                                  ? const Center(
                                      child:
                                          CircularProgressIndicator(
                                        valueColor:
                                            AlwaysStoppedAnimation<
                                                Color>(AppColors.accent),
                                      ),
                                    )
                                  : orders.isEmpty
                                      ? const Center(
                                          child: Text(
                                              'No orders found',
                                              style: TextStyle(
                                                  color: AppColors
                                                      .textMuted)))
                                      : ListView.separated(
                                          itemCount: orders.length,
                                          separatorBuilder: (_, __) =>
                                              const Divider(
                                                  color: AppColors
                                                      .textPrimary10),
                                          itemBuilder: (context, i) {
                                            final o = orders[i];
                                            final oid =
                                                o['id'] ?? '#';
                                            final total = double.tryParse(
                                                    o['total']
                                                            ?.toString() ??
                                                        '0') ??
                                                0;
                                            final status =
                                                o['status'] ??
                                                    'pending';
                                            final date = o['createdAt']
                                                ?.toString()
                                                .split('T')[0] ??
                                                '';
                                            return ListTile(
                                              title: Text(
                                                  'Order #$oid',
                                                  style: const TextStyle(
                                                      fontFamily:
                                                          'Outfit',
                                                      color: AppColors
                                                          .textPrimary,
                                                      fontWeight:
                                                          FontWeight
                                                              .bold,
                                                      fontSize: 14)),
                                              subtitle: Text(
                                                  date,
                                                  style: const TextStyle(
                                                      color: AppColors
                                                          .textMuted,
                                                      fontSize: 12)),
                                              trailing: Column(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .center,
                                                crossAxisAlignment:
                                                    CrossAxisAlignment
                                                        .end,
                                                children: [
                                                  Text(
                                                    currencyFormat
                                                        .format(total),
                                                    style: const TextStyle(
                                                        fontFamily:
                                                            'Outfit',
                                                        color: AppColors
                                                            .accent,
                                                        fontWeight:
                                                            FontWeight
                                                                .bold,
                                                        fontSize: 14),
                                                  ),
                                                  const SizedBox(
                                                      height: 2),
                                                  Text(
                                                    status
                                                        .toUpperCase(),
                                                    style: TextStyle(
                                                      fontFamily:
                                                          'Outfit',
                                                      color: status
                                                          .toString()
                                                          .statusColor,
                                                      fontSize: 9,
                                                      fontWeight:
                                                          FontWeight
                                                              .bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            );
                                          },
                                        ),
                            ),
                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('Close',
                                  style: TextStyle(
                                      color:
                                          AppColors.textPrimary54)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  void _showCustomerLogs(BuildContext context, String phone) {
    showDialog(
      context: context,
      builder: (ctx) {
        return FutureBuilder(
          future: ApiClient.get(ApiConfig.customerLogs(phone)),
          builder: (context, snapshot) {
            List<dynamic> logs = [];
            bool loading =
                snapshot.connectionState != ConnectionState.done;
            if (snapshot.hasData &&
                snapshot.data!.statusCode == 200) {
              final data = jsonDecode(snapshot.data!.body);
              logs = data['data'] ?? data ?? [];
            }
            return Dialog(
              backgroundColor: Colors.transparent,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.cardBg.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(20),
                      border:
                          Border.all(color: AppColors.cardBorder),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('Activity Logs',
                            style: TextStyle(
                                fontFamily: 'Outfit',
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 18)),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 300,
                          child: loading
                              ? const Center(
                                  child: CircularProgressIndicator(
                                    valueColor:
                                        AlwaysStoppedAnimation<Color>(
                                            AppColors.accent),
                                  ),
                                )
                              : logs.isEmpty
                                  ? const Center(
                                      child: Text(
                                          'No activity recorded',
                                          style: TextStyle(
                                              color: AppColors
                                                  .textMuted)))
                                  : ListView.separated(
                                      itemCount: logs.length,
                                      separatorBuilder: (_, __) =>
                                          const Divider(
                                              color: AppColors
                                                  .textPrimary10),
                                      itemBuilder: (context, i) {
                                        final log = logs[i];
                                        final action = log['action'] ??
                                            log['event'] ?? 'Activity';
                                        final desc = log[
                                                    'description'] ??
                                                log['details'] ??
                                                '';
                                        final date = log['createdAt']
                                            ?.toString()
                                            .split('T')[0] ??
                                            '';
                                        return ListTile(
                                          leading: const Icon(
                                              Icons.circle,
                                              color: AppColors.accent,
                                              size: 8),
                                          title: Text(
                                              action.toString(),
                                              style: const TextStyle(
                                                  fontFamily: 'Outfit',
                                                  color: AppColors
                                                      .textPrimary,
                                                  fontWeight:
                                                      FontWeight.w600,
                                                  fontSize: 13)),
                                          subtitle: Text(
                                              '$desc${date.isNotEmpty ? ' • $date' : ''}',
                                              style: const TextStyle(
                                                  color: AppColors
                                                      .textMuted,
                                                  fontSize: 11)),
                                        );
                                      },
                                    ),
                        ),
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Close',
                              style: TextStyle(
                                  color: AppColors.textPrimary54)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CustomersProvider>();
    final list = provider.customers;

    return GlassScaffold(
      title: 'Customers Directory',
      actions: [
        if (list.isNotEmpty)
          IconButton(
            icon: const Icon(Icons.select_all,
                color: AppColors.textPrimary),
            onPressed: () => _toggleSelectAll(list),
          ),
      ],
      bottomNavigationBar: _selectedPhones.isNotEmpty
          ? Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                border: Border(
                    top: BorderSide(color: AppColors.textPrimary10)),
              ),
              child: GlassButton(
                label:
                    'Setup WhatsApp Broadcast (${_selectedPhones.length})',
                onPressed: _showBroadcastCampaignSheet,
              ),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: GlassInput(
              controller: _searchController,
              hint: 'Search customer name or phone...',
              prefixIcon: const Icon(Icons.search,
                  color: AppColors.accent, size: 20),
            ),
          ),
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                          AppColors.accent),
                    ),
                  )
                : list.isEmpty
                    ? Center(
                        child: Text(
                          'No customer logs recorded',
                          style:
                              TextStyle(color: AppColors.textMuted),
                        ),
                      )
                    : ListView.separated(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: list.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final customer = list[index];
                          final id = customer['id'] ?? 0;
                          final name = customer['name'] ??
                              'Guest Customer';
                          final phone = customer['phone']
                                  ?.toString() ??
                              'N/A';
                          final email =
                              customer['email'] ?? 'N/A';
                          final isSelected =
                              _selectedPhones.contains(phone);

                          return GlassCard(
                            padding: const EdgeInsets.symmetric(
                                vertical: 4, horizontal: 4),
                            child: ListTile(
                              leading: Checkbox(
                                activeColor: AppColors.accent,
                                checkColor: Colors.white,
                                value: isSelected,
                                onChanged: (_) =>
                                    _toggleSelectCustomer(phone),
                              ),
                              title: Text(
                                name,
                                style: const TextStyle(
                                    fontFamily: 'Outfit',
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15),
                              ),
                              subtitle: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('Phone: $phone',
                                      style: const TextStyle(
                                          color:
                                              AppColors.textMuted,
                                          fontSize: 12)),
                                  Text('Email: $email',
                                      style: const TextStyle(
                                          color: AppColors
                                              .textMuted,
                                          fontSize: 11)),
                                ],
                              ),
                              trailing: PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert,
                                    color:
                                        AppColors.textPrimary54),
                                color: AppColors.surface,
                                onSelected: (value) async {
                                  if (value == 'orders') {
                                    _showCustomerOrders(
                                        context, phone);
                                  } else if (value == 'logs') {
                                    _showCustomerLogs(
                                        context, phone);
                                  } else if (value == 'delete') {
                                    final success =
                                        await provider
                                            .deleteCustomer(id);
                                    if (success && mounted) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        const SnackBar(
                                            content: Text(
                                                'Customer profile deleted'),
                                            backgroundColor:
                                                AppColors.green),
                                      );
                                    }
                                  }
                                },
                                itemBuilder: (context) => [
                                  const PopupMenuItem(
                                    value: 'orders',
                                    child: ListTile(
                                      leading: Icon(
                                          Icons.receipt_long,
                                          color: AppColors.accent),
                                      title: Text(
                                          'Order History',
                                          style: TextStyle(
                                              color: AppColors
                                                  .textPrimary,
                                              fontSize: 14)),
                                      dense: true,
                                    ),
                                  ),
                                  const PopupMenuItem(
                                    value: 'logs',
                                    child: ListTile(
                                      leading: Icon(Icons.history,
                                          color: AppColors.green),
                                      title: Text(
                                          'Activity Logs',
                                          style: TextStyle(
                                              color: AppColors
                                                  .textPrimary,
                                              fontSize: 14)),
                                      dense: true,
                                    ),
                                  ),
                                  const PopupMenuItem(
                                    value: 'delete',
                                    child: ListTile(
                                      leading: Icon(Icons.delete,
                                          color: AppColors.red),
                                      title: Text(
                                          'Delete Customer',
                                          style: TextStyle(
                                              color:
                                                  AppColors.red,
                                              fontSize: 14)),
                                      dense: true,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
