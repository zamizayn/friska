import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branches_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../auth/login_screen.dart';

import 'dashboard_screen.dart';
import '../orders/orders_screen.dart';
import '../products/products_screen.dart';
import '../categories/categories_screen.dart';
import '../customers/customers_screen.dart';
import '../inventory/inventory_screen.dart';
import '../offers/offers_screen.dart';
import '../support/support_screen.dart';
import '../settings/settings_screen.dart';
import '../settings/change_password_screen.dart';
import '../analytics/product_sales_screen.dart';
import '../settings/whatsapp_flows_screen.dart';
import '../settings/payment_settings_screen.dart';
import '../settings/platform_settings_screen.dart';
import '../tenants/tenants_screen.dart';
import '../branches/branches_screen.dart';
import '../delivery_boys/delivery_boys_screen.dart';
import '../notifications/notifications_screen.dart';

class DashboardLayout extends StatefulWidget {
  const DashboardLayout({super.key});

  @override
  State<DashboardLayout> createState() => _DashboardLayoutState();
}

class _DashboardLayoutState extends State<DashboardLayout> {
  int _currentTabIndex = 0;

  final List<Widget> _tabs = [
    const DashboardScreen(),
    const OrdersScreen(),
    const ProductsScreen(),
  ];

  final List<String> _tabTitles = [
    'Analytics Feed',
    'Orders Log',
    'Product Catalog',
  ];

  @override
  void initState() {
    super.initState();
    // Load initial multi-branch credentials and analytical records
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BranchesProvider>().fetchBranches();
      context.read<DashboardProvider>().fetchDashboardData();
    });
  }

  void _onBranchChanged(String? newBranchId, String newBranchName) {
    if (newBranchId != null) {
      context
          .read<BranchesProvider>()
          .selectBranch(newBranchId, newBranchName)
          .then((_) {
        context.read<DashboardProvider>().fetchDashboardData();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Switched view to branch: $newBranchName'),
            backgroundColor: AppColors.accent,
          ),
        );
      });
    }
  }

  void _showNotificationPanel() {
    final dashboardProvider = context.read<DashboardProvider>();
    dashboardProvider.markNotificationsAsRead();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Consumer<DashboardProvider>(
          builder: (context, provider, child) {
            final list = provider.notifications;
            return Container(
              padding: const EdgeInsets.all(24.0),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(
                  top: BorderSide(color: AppColors.cardBorder),
                ),
              ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Notifications',
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const Icon(Icons.notifications_active,
                              color: AppColors.accent),
                        ],
                      ),
                      const SizedBox(height: 20),
                      list.isEmpty
                          ? const Padding(
                              padding: EdgeInsets.all(28.0),
                              child: Center(
                                child: Text(
                                  'No new logs found',
                                  style: TextStyle(color: AppColors.textMuted),
                                ),
                              ),
                            )
                          : Expanded(
                              child: ListView.separated(
                                itemCount: list.length,
                                separatorBuilder: (_, __) =>
                                    const Divider(color: AppColors.textPrimary10),
                                itemBuilder: (context, index) {
                                  final item = list[index];
                                  return Padding(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 8.0),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: AppColors.accent.withOpacity(0.1),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.info_outline,
                                              color: AppColors.accent, size: 18),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                item['message'] ??
                                                    'Notification alert',
                                                style: TextStyle(
                                                    fontFamily: 'Inter',
                                                    color: AppColors.textPrimary,
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w600),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                item['createdAt'] != null
                                                    ? item['createdAt']
                                                        .toString()
                                                        .split('T')[0]
                                                    : 'Just now',
                                                style: TextStyle(
                                                    fontFamily: 'Inter',
                                                    color: AppColors.textMuted,
                                                    fontSize: 11),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ),
                    ],
                  ),
                );
          },
        );
      },
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? iconColor,
    bool isActive = false,
  }) {
    final col = iconColor ?? AppColors.textSecondary;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            Navigator.pop(context);
            onTap();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: isActive ? AppColors.accentBg : null,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(icon, size: 20, color: isActive ? AppColors.accent : col),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 14.5,
                      fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                      color: isActive ? AppColors.accent : AppColors.textPrimary,
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

  Widget _buildDrawerSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 18, right: 18, top: 24, bottom: 6),
      child: Row(
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Divider(color: AppColors.cardBorder.withOpacity(0.5))),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final branchesProvider = context.watch<BranchesProvider>();
    final dashboardProvider = context.watch<DashboardProvider>();

    final userRole = authProvider.role;
    final isSuperAdmin = userRole == 'superadmin';
    final isTenant = userRole == 'tenant';

    final titleWidget = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _tabTitles[_currentTabIndex],
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          isSuperAdmin ? 'Platform SuperAdmin' : authProvider.tenantName,
          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
        ),
      ],
    );

    return GlassScaffold(
      titleWidget: titleWidget,
      actions: [
        if (!isSuperAdmin && branchesProvider.branches.isNotEmpty)
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: AppColors.textPrimary.withOpacity(0.05),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                dropdownColor: AppColors.cardOpacityBg,
                value: branchesProvider.selectedBranchId,
                style: const TextStyle(
                    fontFamily: 'Outfit',
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600),
                icon: const Icon(Icons.keyboard_arrow_down,
                    color: AppColors.accent, size: 16),
                onChanged: (String? val) {
                  final target = branchesProvider.branches
                      .firstWhere((b) => b['id']?.toString() == val);
                  _onBranchChanged(val, target['name'] ?? 'Branch');
                },
                items: branchesProvider.branches
                    .map<DropdownMenuItem<String>>((dynamic b) {
                  return DropdownMenuItem<String>(
                    value: b['id']?.toString() ?? '',
                    child: Text(b['name'] ?? 'Branch'),
                  );
                }).toList(),
              ),
            ),
          ),
        const SizedBox(width: 8),
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications,
                  color: AppColors.textPrimary, size: 24),
              onPressed: _showNotificationPanel,
            ),
            if (dashboardProvider.unreadNotificationsCount > 0)
              Positioned(
                top: 10,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: AppColors.red,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    dashboardProvider.unreadNotificationsCount.toString(),
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 8,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(width: 8),
      ],
      drawer: Drawer(
        child: Container(
          color: AppColors.surface,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: AppColors.cardBorder.withOpacity(0.5)),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.accentBg,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.store, color: AppColors.accent, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isSuperAdmin ? 'SuperAdmin' : authProvider.tenantName,
                            style: const TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isSuperAdmin ? 'Platform Admin' : userRole.replaceAll('_', ' '),
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (isSuperAdmin) ...[
                        _buildDrawerSectionTitle('Superadmin Control'),
                        _buildDrawerItem(
                          icon: Icons.business,
                          title: 'Tenants Registry',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) => const TenantsScreen())),
                        ),
                      ],
                      if (!isSuperAdmin) ...[
                        _buildDrawerSectionTitle('Store Operations'),
                        _buildDrawerItem(
                          icon: Icons.category,
                          title: 'Category Manager',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const CategoriesScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.business,
                          title: 'Branches',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const BranchesScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.people,
                          title: 'Customers Directory',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const CustomersScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.inventory_2,
                          title: 'Stock Operations',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const InventoryScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.local_offer,
                          title: 'Offers & Promos',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const OffersScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.delivery_dining,
                          title: 'Delivery Boys',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const DeliveryBoysScreen())),
                        ),
                      ],
                      _buildDrawerSectionTitle('Insights & Support'),
                      _buildDrawerItem(
                        icon: Icons.notifications,
                        title: 'Notifications',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) =>
                                    const NotificationsScreen())),
                      ),
                      if (!isSuperAdmin) ...[
                        _buildDrawerItem(
                          icon: Icons.insights,
                          title: 'Sales Analytics',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const ProductSalesScreen())),
                        ),
                      ],
                      _buildDrawerItem(
                        icon: Icons.support_agent,
                        title: 'Support Tickets',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const SupportScreen())),
                      ),
                      if (isTenant || isSuperAdmin) ...[
                        _buildDrawerSectionTitle('Platform Configs'),
                        _buildDrawerItem(
                          icon: Icons.settings,
                          title: 'Platform Hubs',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const SettingsScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.chat,
                          title: 'WhatsApp Flows',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const WhatsAppFlowsScreen())),
                        ),
                        _buildDrawerItem(
                          icon: Icons.payment,
                          title: 'Payment Settings',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const PaymentSettingsScreen())),
                        ),
                      ],
                      if (isSuperAdmin) ...[
                        _buildDrawerItem(
                          icon: Icons.admin_panel_settings,
                          title: 'Platform Settings',
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                      const PlatformSettingsScreen())),
                        ),
                      ],
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                        child: Divider(color: AppColors.cardBorder),
                      ),
                      _buildDrawerItem(
                        icon: Icons.lock_reset,
                        title: 'Change Password',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) =>
                                    const ChangePasswordScreen())),
                      ),
                      _buildDrawerItem(
                        icon: Icons.logout,
                        title: 'Secure Log Out',
                        iconColor: AppColors.red,
                        onTap: () async {
                          await context.read<AuthProvider>().logout();
                          if (mounted) {
                            Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(
                                    builder: (context) => const LoginScreen()),
                                (route) => false);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: _tabs[_currentTabIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(color: AppColors.cardBorder),
          ),
        ),
        child: BottomNavigationBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
              currentIndex: _currentTabIndex,
              selectedItemColor: AppColors.accent,
              unselectedItemColor: AppColors.textMuted,
              selectedLabelStyle: const TextStyle(
                  fontFamily: 'Outfit',
                  fontWeight: FontWeight.bold,
                  fontSize: 11),
              unselectedLabelStyle: const TextStyle(
                  fontFamily: 'Outfit',
                  fontWeight: FontWeight.w600,
                  fontSize: 11),
              onTap: (index) {
                setState(() {
                  _currentTabIndex = index;
                });
              },
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.bar_chart),
                  label: 'Analytics',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.shopping_bag),
                  label: 'Orders',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.grid_view),
                  label: 'Catalog',
                ),
              ],
            ),
          ),
      );
  }
}
