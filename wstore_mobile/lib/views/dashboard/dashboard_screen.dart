import 'dart:convert';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../providers/dashboard_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final currencyFormat =
      NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);

  String _formatActivityText(Map<String, dynamic> log) {
    final actionType = log['actionType'] ?? log['action'] ?? '';
    final details = log['details'];
    Map<String, dynamic> detailsMap = {};
    if (details is Map) {
      detailsMap = Map<String, dynamic>.from(details);
    } else if (details is String) {
      try {
        detailsMap = jsonDecode(details);
      } catch (_) {}
    }

    switch (actionType) {
      case 'PRODUCT_VIEWED':
        return 'Viewed product: ${detailsMap['productName'] ?? 'Unknown'}';
      case 'SEARCHED':
        return 'Searched for: "${detailsMap['query'] ?? ''}"';
      case 'ADDED_TO_CART':
        return 'Added to cart: ${detailsMap['productName'] ?? 'Unknown'}';
      case 'CHECKOUT':
        return 'Started checkout process';
      case 'CATEGORY_VIEWED':
        return 'Browsed category: ${detailsMap['categoryName'] ?? 'Unknown'}';
      case 'SUPPORT_REQUEST':
        return 'Asked for support';
      default:
        return detailsMap['productName'] ??
            log['details']?.toString() ??
            'Customer interaction logged';
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().setDateRange('today');
    });
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String sub,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF64748B),
                  letterSpacing: 1.0,
                ),
              ),
              Icon(icon, color: color, size: 20),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            sub,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: const Color(0xFF10B981),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateFilterPill(
      String key, String label, String activeKey, Function(String) onTap) {
    bool isActive = key == activeKey;
    return GestureDetector(
      onTap: () => onTap(key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? const Color(0xFF6366F1)
              : AppColors.cardOpacityBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? const Color(0xFF6366F1)
                : AppColors.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.outfit(
            color: isActive ? Colors.white : const Color(0xFF94A3B8),
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DashboardProvider>();

    if (provider.isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
          ),
        ),
      );
    }

    final kpi = provider.kpis;
    final totalRevenue =
        double.tryParse(kpi['revenue']?.toString() ?? '0') ?? 0.0;
    final totalOrders =
        int.tryParse(kpi['totalOrders']?.toString() ?? '0') ?? 0;
    final activeCustomers =
        int.tryParse(kpi['activeCustomers']?.toString() ?? '0') ?? 0;
    final aovValue = double.tryParse(kpi['aov']?.toString() ?? '0') ?? 0.0;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Date filters
            Row(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildDateFilterPill('today', 'Today',
                            provider.dateRange, provider.setDateRange),
                        const SizedBox(width: 8),
                        _buildDateFilterPill('yesterday', 'Yesterday',
                            provider.dateRange, provider.setDateRange),
                        const SizedBox(width: 8),
                        _buildDateFilterPill('7days', '7 Days',
                            provider.dateRange, provider.setDateRange),
                        const SizedBox(width: 8),
                        _buildDateFilterPill('month', 'Month',
                            provider.dateRange, provider.setDateRange),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Premium Custom Calendar Button
                GestureDetector(
                  onTap: () async {
                    final DateTimeRange? picked = await showDateRangePicker(
                      context: context,
                      initialDateRange: provider.customStartDate != null &&
                              provider.customEndDate != null
                          ? DateTimeRange(
                              start: provider.customStartDate!,
                              end: provider.customEndDate!)
                          : DateTimeRange(
                              start: DateTime.now()
                                  .subtract(const Duration(days: 7)),
                              end: DateTime.now()),
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 1)),
                      builder: (context, child) {
                        return Theme(
                          data: Theme.of(context).copyWith(
                            colorScheme: const ColorScheme.dark(
                              primary: Color(0xFF6366F1),
                              onPrimary: Colors.white,
                              surface: AppColors.surface,
                              onSurface: Color(0xFFE2E8F0),
                            ),
                            dialogBackgroundColor: AppColors.background,
                          ),
                          child: child!,
                        );
                      },
                    );
                    if (picked != null) {
                      provider.setCustomDateRange(picked.start, picked.end);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: provider.dateRange == 'custom'
                          ? const Color(0xFF6366F1)
                          : AppColors.cardOpacityBg,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: provider.dateRange == 'custom'
                            ? const Color(0xFF6366F1)
                            : AppColors.cardBorder,
                      ),
                    ),
                    child: const Icon(
                      Icons.calendar_month_outlined,
                      color: AppColors.textPrimary,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
            if (provider.dateRange == 'custom' &&
                provider.customStartDate != null &&
                provider.customEndDate != null) ...[
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: const Color(0xFF6366F1).withOpacity(0.2)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.date_range,
                            color: Color(0xFF818CF8), size: 18),
                        const SizedBox(width: 8),
                        Text(
                          '${DateFormat('dd MMM, yyyy').format(provider.customStartDate!)}  -  ${DateFormat('dd MMM, yyyy').format(provider.customEndDate!)}',
                          style: GoogleFonts.outfit(
                            color: AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: () => provider.setDateRange('today'),
                      child: const Icon(Icons.close,
                          color: AppColors.textPrimary70, size: 18),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Stat Cards Grid
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.15,
              children: [
                _buildStatCard(
                  title: 'REVENUE',
                  value: currencyFormat.format(totalRevenue),
                  sub: '+12.5% vs last week',
                  icon: Icons.currency_rupee,
                  color: const Color(0xFF10B981),
                ),
                _buildStatCard(
                  title: 'TOTAL ORDERS',
                  value: totalOrders.toString(),
                  sub: '+8.4% vs last week',
                  icon: Icons.shopping_basket,
                  color: const Color(0xFF6366F1),
                ),
                _buildStatCard(
                  title: 'ACTIVE CLIENTS',
                  value: activeCustomers.toString(),
                  sub: '+18.2% vs last week',
                  icon: Icons.people_outline,
                  color: const Color(0xFFF59E0B),
                ),
                _buildStatCard(
                  title: 'AVERAGE VALUE',
                  value: currencyFormat.format(aovValue),
                  sub: '+3.1% vs last week',
                  icon: Icons.insights,
                  color: const Color(0xFFEC4899),
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Chart Title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Revenue Trend (INR)',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Icon(Icons.show_chart, color: Color(0xFF6366F1)),
              ],
            ),
            const SizedBox(height: 16),

            // FlChart Line Graph
            Container(
              height: 220,
              padding: const EdgeInsets.only(right: 20, top: 16, bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: provider.revenueTrend.isEmpty
                  ? Center(
                      child: Text(
                        'Not enough trend data for dates',
                        style:
                            GoogleFonts.inter(color: const Color(0xFF475569)),
                      ),
                    )
                  : LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          getDrawingHorizontalLine: (value) => FlLine(
                            color: AppColors.cardOpacityBg,
                            strokeWidth: 1,
                          ),
                        ),
                        titlesData: FlTitlesData(
                          show: true,
                          rightTitles: const AxisTitles(
                              sideTitles: SideTitles(showTitles: false)),
                          topTitles: const AxisTitles(
                              sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 22,
                              interval: 1,
                              getTitlesWidget: (value, meta) {
                                final index = value.toInt();
                                if (index >= 0 &&
                                    index < provider.revenueTrend.length) {
                                  final rawDate = provider.revenueTrend[index]
                                              ['date']
                                          ?.toString() ??
                                      '';
                                  final shortDate = rawDate.contains('-')
                                      ? rawDate.split('-').last
                                      : rawDate;
                                  return SideTitleWidget(
                                    axisSide: meta.axisSide,
                                    child: Text(
                                      shortDate,
                                      style: GoogleFonts.inter(
                                          color: const Color(0xFF475569),
                                          fontSize: 10),
                                    ),
                                  );
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ),
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 45,
                              getTitlesWidget: (value, meta) {
                                return SideTitleWidget(
                                  axisSide: meta.axisSide,
                                  child: Text(
                                    value >= 1000
                                        ? '${(value / 1000).toStringAsFixed(0)}k'
                                        : value.toStringAsFixed(0),
                                    style: GoogleFonts.inter(
                                        color: const Color(0xFF475569),
                                        fontSize: 10),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots:
                                provider.revenueTrend.asMap().entries.map((e) {
                              final val = double.tryParse(
                                      e.value['revenue']?.toString() ?? '0') ??
                                  0.0;
                              return FlSpot(e.key.toDouble(), val);
                            }).toList(),
                            isCurved: true,
                            gradient: const LinearGradient(
                              colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
                            ),
                            barWidth: 4,
                            isStrokeCapRound: true,
                            dotData: const FlDotData(show: false),
                            belowBarData: BarAreaData(
                              show: true,
                              gradient: LinearGradient(
                                colors: [
                                  const Color(0xFF6366F1).withOpacity(0.2),
                                  const Color(0xFFA855F7).withOpacity(0.0),
                                ],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
            const SizedBox(height: 28),

            // Low Stock Warning Section
            if (provider.lowStockAlerts.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: Color(0xFFEF4444), size: 22),
                  const SizedBox(width: 8),
                  Text(
                    'Inventory Low Stock Warnings',
                    style: GoogleFonts.outfit(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: const Color(0xFFEF4444).withOpacity(0.1)),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: provider.lowStockAlerts.length,
                  separatorBuilder: (_, __) =>
                      const Divider(color: AppColors.textPrimary10, height: 1),
                  itemBuilder: (context, index) {
                    final item = provider.lowStockAlerts[index];
                    return ListTile(
                      title: Text(
                        item['name'] ?? 'Product',
                        style: GoogleFonts.outfit(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 14),
                      ),
                      subtitle: Text(
                        'Category: ${item['category']?['name'] ?? 'General'}',
                        style: GoogleFonts.inter(
                            color: const Color(0xFF64748B), fontSize: 11),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${item['stock'] ?? 0} left',
                          style: GoogleFonts.outfit(
                              color: const Color(0xFFFCA5A5),
                              fontWeight: FontWeight.bold,
                              fontSize: 11),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 28),
            ],

            // Live Activity Feed Title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Live Activity Logs',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Icon(Icons.bolt, color: Color(0xFFF59E0B)),
              ],
            ),
            const SizedBox(height: 14),

            // Activity Log List
            Container(
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: provider.activityFeed.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(28.0),
                      child: Center(
                        child: Text(
                          'No customer logs recorded',
                          style:
                              GoogleFonts.inter(color: const Color(0xFF475569)),
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: provider.activityFeed.length > 8
                          ? 8
                          : provider.activityFeed.length,
                      separatorBuilder: (_, __) =>
                          const Divider(color: AppColors.textPrimary10, height: 1),
                      itemBuilder: (context, index) {
                        final log = Map<String, dynamic>.from(
                            provider.activityFeed[index]);
                        final action =
                            log['actionType'] ?? log['action'] ?? 'ACTIVITY';
                        final text = _formatActivityText(log);
                        final time = log['createdAt'] != null
                            ? log['createdAt'].toString().split('T')[0]
                            : 'Just now';

                        Color actionColor = const Color(0xFF6366F1);
                        IconData actionIcon = Icons.remove_red_eye;

                        if (action == 'CHECKOUT') {
                          actionColor = const Color(0xFFEF4444);
                          actionIcon = Icons.shopping_cart;
                        } else if (action == 'PRODUCT_VIEWED') {
                          actionColor = const Color(0xFF6366F1);
                          actionIcon = Icons.mouse;
                        } else if (action == 'ADDED_TO_CART') {
                          actionColor = const Color(0xFF10B981);
                          actionIcon = Icons.shopping_bag;
                        } else if (action == 'SEARCHED') {
                          actionColor = const Color(0xFFF59E0B);
                          actionIcon = Icons.search;
                        } else if (action == 'CATEGORY_VIEWED') {
                          actionColor = const Color(0xFF38BDF8);
                          actionIcon = Icons.grid_view;
                        } else if (action == 'SUPPORT_REQUEST') {
                          actionColor = const Color(0xFF8B5CF6);
                          actionIcon = Icons.phone;
                        }

                        return ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: actionColor.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              actionIcon,
                              color: actionColor,
                              size: 16,
                            ),
                          ),
                          title: Text(
                            text,
                            style: GoogleFonts.inter(
                                color: AppColors.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            action.toString().replaceAll('_', ' '),
                            style: GoogleFonts.outfit(
                                color: actionColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 10),
                          ),
                          trailing: Text(
                            time,
                            style: GoogleFonts.inter(
                                color: const Color(0xFF475569), fontSize: 11),
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }
}