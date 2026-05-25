import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../config/api_config.dart';
import '../../config/theme_config.dart';
import '../../services/api_client.dart';
import '../../widgets/glass_scaffold.dart';

class ProductSalesScreen extends StatefulWidget {
  const ProductSalesScreen({super.key});

  @override
  State<ProductSalesScreen> createState() => _ProductSalesScreenState();
}

class _ProductSalesScreenState extends State<ProductSalesScreen> {
  bool _isLoading = true;
  List<dynamic> _salesData = [];
  String _errorMessage = '';

  final currencyFormat = NumberFormat.currency(locale: 'HI', symbol: '₹', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _fetchSalesData();
  }

  Future<void> _fetchSalesData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final res = await ApiClient.get(ApiConfig.productSales);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _salesData = data is List ? data : [];
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = 'Failed to load sales data.';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Network error occurred.';
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return GlassCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChart(List<dynamic> topProducts) {
    if (topProducts.isEmpty) {
      return const SizedBox(
        height: 250,
        child: Center(child: Text('No data for chart')),
      );
    }

    final colors = [
      AppColors.accent,
      AppColors.green,
      AppColors.amber,
      AppColors.red,
      const Color(0xFF8B5CF6),
    ];

    double maxRevenue = topProducts.fold(0.0, (max, p) {
      final rev = (p['totalRevenue'] ?? 0).toDouble();
      return rev > max ? rev : max;
    });

    if (maxRevenue == 0) maxRevenue = 100;

    return GlassCard(
      child: SizedBox(
        height: 300,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Top Products by Revenue',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxRevenue * 1.2,
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() < 0 || value.toInt() >= topProducts.length) {
                            return const SizedBox.shrink();
                          }
                          String name = topProducts[value.toInt()]['name'] ?? '';
                          if (name.length > 8) name = '${name.substring(0, 8)}...';
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              name,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                color: AppColors.textSecondary,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          );
                        },
                        reservedSize: 32,
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          if (value == 0) return const SizedBox.shrink();
                          return Text(
                            NumberFormat.compactCurrency(locale: 'en_IN', symbol: '₹').format(value),
                            style: TextStyle(
                              fontFamily: 'Inter',
                              color: AppColors.textMuted,
                              fontSize: 10,
                            ),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: AppColors.cardBorder,
                      strokeWidth: 1,
                      dashArray: [4, 4],
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: topProducts.asMap().entries.map((entry) {
                    final index = entry.key;
                    final product = entry.value;
                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: (product['totalRevenue'] ?? 0).toDouble(),
                          color: colors[index % colors.length],
                          width: 20,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductList(List<dynamic> products) {
    if (products.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Text(
            'No sales data available.',
            style: TextStyle(fontFamily: 'Inter', color: AppColors.textMuted),
          ),
        ),
      );
    }

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'Product Performance',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.cardBorder),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: products.length,
            separatorBuilder: (context, index) => const Divider(height: 1, color: AppColors.cardBorder),
            itemBuilder: (context, index) {
              final product = products[index];
              return Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product['name'] ?? 'Unknown',
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'ID: ${product['id']}',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              color: AppColors.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 1,
                      child: Text(
                        '${product['totalQuantity']} qty',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        currencyFormat.format(product['totalRevenue']),
                        style: TextStyle(
                          fontFamily: 'Outfit',
                          fontWeight: FontWeight.w800,
                          color: AppColors.accent,
                          fontSize: 14,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    double totalRevenue = 0;
    int totalQty = 0;
    for (var p in _salesData) {
      totalRevenue += (p['totalRevenue'] ?? 0).toDouble();
      totalQty += (p['totalQuantity'] ?? 0) as int;
    }
    double avgPrice = totalQty > 0 ? totalRevenue / totalQty : 0;

    final topProducts = List<dynamic>.from(_salesData)
      ..sort((a, b) => (b['totalRevenue'] ?? 0).compareTo(a['totalRevenue'] ?? 0));
    final top10 = topProducts.take(10).toList();

    return GlassScaffold(
      title: 'Sales Analytics',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: AppColors.textPrimary),
          onPressed: _fetchSalesData,
        ),
      ],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent)))
          : _errorMessage.isNotEmpty
              ? Center(child: Text(_errorMessage, style: const TextStyle(color: Colors.red)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildStatCard(
                        title: 'TOTAL REVENUE',
                        value: currencyFormat.format(totalRevenue),
                        icon: Icons.currency_rupee,
                        color: AppColors.accent,
                        bgColor: AppColors.accent.withOpacity(0.1),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatCard(
                              title: 'UNITS SOLD',
                              value: totalQty.toString(),
                              icon: Icons.shopping_bag,
                              color: AppColors.green,
                              bgColor: AppColors.green.withOpacity(0.1),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildStatCard(
                              title: 'AVG. PRICE',
                              value: currencyFormat.format(avgPrice),
                              icon: Icons.trending_up,
                              color: AppColors.amber,
                              bgColor: AppColors.amber.withOpacity(0.1),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildChart(top10),
                      const SizedBox(height: 24),
                      _buildProductList(_salesData),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
    );
  }
}
