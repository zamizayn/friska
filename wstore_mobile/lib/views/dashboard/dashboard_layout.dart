import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branches_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../auth/login_screen.dart';

// Screens imports (to be created in Milestone 6)
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
import '../tenants/tenants_screen.dart';

class DashboardLayout extends StatefulWidget {
  const DashboardLayout({super.key});

  @override
  State<DashboardLayout> createState() => _DashboardLayoutState();
}

class _DashboardLayoutState extends State<DashboardLayout> {
  int _currentTabIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

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
            backgroundColor: const Color(0xFF6366F1),
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
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Consumer<DashboardProvider>(
          builder: (context, provider, child) {
            final list = provider.notifications;
            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Notifications',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const Icon(Icons.notifications_active,
                          color: Color(0xFF6366F1)),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Expanded(
                    child: list.isEmpty
                        ? Center(
                            child: Text(
                              'No new logs found',
                              style: GoogleFonts.inter(
                                  color: const Color(0xFF475569)),
                            ),
                          )
                        : ListView.separated(
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
                                        color: const Color(0xFF6366F1)
                                            .withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.info_outline,
                                          color: Color(0xFF6366F1), size: 18),
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
                                            style: GoogleFonts.inter(
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
                                            style: GoogleFonts.inter(
                                                color: const Color(0xFF64748B),
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
    final Color activeColor = AppColors.primary;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          splashColor: activeColor.withOpacity(0.08),
          highlightColor: activeColor.withOpacity(0.05),
          hoverColor: activeColor.withOpacity(0.04),
          onTap: () {
            Navigator.pop(context);
            onTap();
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOut,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: isActive
                  ? LinearGradient(
                      colors: [
                        activeColor.withOpacity(0.15),
                        activeColor.withOpacity(0.06),
                      ],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    )
                  : null,
              border: Border.all(
                color: isActive
                    ? activeColor.withOpacity(0.25)
                    : Colors.grey.withOpacity(0.08),
              ),
              boxShadow: [
                if (isActive)
                  BoxShadow(
                    color: activeColor.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
              ],
            ),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isActive
                        ? activeColor.withOpacity(0.12)
                        : AppColors.cardBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: isActive
                        ? activeColor
                        : (iconColor ?? AppColors.textSecondary),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.outfit(
                      fontSize: 15.5,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                      color: isActive ? activeColor : AppColors.textPrimary,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isActive
                        ? activeColor.withOpacity(0.10)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 14,
                    color: isActive ? activeColor : AppColors.textMuted,
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
      padding: const EdgeInsets.only(
        left: 22,
        right: 22,
        top: 24,
        bottom: 10,
      ),
      child: Row(
        children: [
          Container(
            width: 5,
            height: 18,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: AppColors.textMuted,
              letterSpacing: 1.4,
            ),
          ),
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

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu, color: AppColors.textPrimary),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _tabTitles[_currentTabIndex],
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              isSuperAdmin ? 'Platform SuperAdmin' : authProvider.tenantName,
              style: GoogleFonts.inter(
                  fontSize: 11, color: const Color(0xFF64748B)),
            ),
          ],
        ),
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
                  dropdownColor: AppColors.surface,
                  value: branchesProvider.selectedBranchId,
                  style: GoogleFonts.outfit(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600),
                  icon: const Icon(Icons.keyboard_arrow_down,
                      color: Color(0xFF6366F1), size: 16),
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
                      color: Color(0xFFEF4444),
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
      ),
      drawer: Drawer(
        backgroundColor: AppColors.background,
        child: Column(
          children: [
            DrawerHeader(
              margin: EdgeInsets.zero,
              padding: EdgeInsets.zero,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.surface,
                    AppColors.surface.withOpacity(0.96),
                  ],
                ),
                border: const Border(
                  bottom: BorderSide(
                    color: AppColors.border,
                    width: 1,
                  ),
                ),
              ),
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Image.asset(
                        'assets/images/logo.png',
                        height: 120,
                        width: MediaQuery.of(context).size.width,
                        fit: BoxFit.cover,
                      ),
                    ),

                    /// TOP ROW

                    // Row(
                    //   children: [
                    //     /// LOGO / ICON
                    //     Container(
                    //       padding: const EdgeInsets.all(14),
                    //       decoration: BoxDecoration(
                    //         gradient: const LinearGradient(
                    //           colors: [
                    //             Color(0xFF6366F1),
                    //             Color(0xFF8B5CF6),
                    //             Color(0xFFA855F7),
                    //           ],
                    //           begin: Alignment.topLeft,
                    //           end: Alignment.bottomRight,
                    //         ),
                    //         borderRadius: BorderRadius.circular(20),
                    //         boxShadow: [
                    //           BoxShadow(
                    //             color:
                    //                 const Color(0xFF8B5CF6).withOpacity(0.25),
                    //             blurRadius: 16,
                    //             offset: const Offset(0, 6),
                    //           ),
                    //         ],
                    //       ),
                    //       child: const Icon(
                    //         Icons.auto_awesome_rounded,
                    //         color: Colors.white,
                    //         size: 24,
                    //       ),
                    //     ),

                    //     const Spacer(),

                    //     /// OPTIONAL ACTION
                    //     Container(
                    //       padding: const EdgeInsets.all(8),
                    //       decoration: BoxDecoration(
                    //         color: AppColors.cardBg,
                    //         borderRadius: BorderRadius.circular(14),
                    //         border: Border.all(
                    //           color: AppColors.border.withOpacity(0.6),
                    //         ),
                    //       ),
                    //       child: Icon(
                    //         Icons.notifications_none_rounded,
                    //         size: 20,
                    //         color: AppColors.textSecondary,
                    //       ),
                    //     ),
                    //   ],
                    // ),

                    // const Spacer(),

                    // /// TITLE
                    // Text(
                    //   isSuperAdmin
                    //       ? 'Global Admin'
                    //       : branchesProvider.selectedBranchName,
                    //   maxLines: 1,
                    //   overflow: TextOverflow.ellipsis,
                    //   style: GoogleFonts.outfit(
                    //     fontSize: 20,
                    //     fontWeight: FontWeight.w700,
                    //     color: AppColors.textPrimary,
                    //     letterSpacing: 0.2,
                    //   ),
                    // ),

                    // const SizedBox(height: 8),

                    // /// ROLE + STATUS ROW
                    // Row(
                    //   children: [
                    //     Container(
                    //       padding: const EdgeInsets.symmetric(
                    //         horizontal: 12,
                    //         vertical: 6,
                    //       ),
                    //       decoration: BoxDecoration(
                    //         gradient: LinearGradient(
                    //           colors: [
                    //             const Color(0xFF6366F1).withOpacity(0.18),
                    //             const Color(0xFFA855F7).withOpacity(0.10),
                    //           ],
                    //         ),
                    //         borderRadius: BorderRadius.circular(30),
                    //         border: Border.all(
                    //           color: const Color(0xFF818CF8).withOpacity(0.25),
                    //         ),
                    //       ),
                    //       child: Row(
                    //         children: [
                    //           Container(
                    //             width: 7,
                    //             height: 7,
                    //             decoration: const BoxDecoration(
                    //               color: Color(0xFF22C55E),
                    //               shape: BoxShape.circle,
                    //             ),
                    //           ),
                    //           const SizedBox(width: 8),
                    //           Text(
                    //             userRole.toUpperCase(),
                    //             style: GoogleFonts.outfit(
                    //               fontSize: 10.5,
                    //               fontWeight: FontWeight.w700,
                    //               color: const Color(0xFF818CF8),
                    //               letterSpacing: 0.8,
                    //             ),
                    //           ),
                    //         ],
                    //       ),
                    //     ),
                    //     const SizedBox(width: 10),
                    //     Text(
                    //       "ACTIVE",
                    //       style: GoogleFonts.inter(
                    //         fontSize: 11,
                    //         fontWeight: FontWeight.w600,
                    //         color: AppColors.textMuted,
                    //         letterSpacing: 0.5,
                    //       ),
                    //     ),
                    //   ],
                    // ),
                  ],
                ),
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
                        icon: Icons.people,
                        title: 'Customers Directory',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const CustomersScreen())),
                      ),
                      _buildDrawerItem(
                        icon: Icons.inventory_2,
                        title: 'Stock Operations',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const InventoryScreen())),
                      ),
                      _buildDrawerItem(
                        icon: Icons.local_offer,
                        title: 'Offers & Promos',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const OffersScreen())),
                      ),
                    ],
                    _buildDrawerSectionTitle('Insights & Support'),
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
                                builder: (context) => const SettingsScreen())),
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
                    const Padding(
                      padding:
                          EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      child: Divider(color: AppColors.border),
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
                      iconColor: Colors.redAccent,
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
      body: _tabs[_currentTabIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.textPrimary10)),
        ),
        child: BottomNavigationBar(
          backgroundColor: AppColors.surface,
          currentIndex: _currentTabIndex,
          selectedItemColor: const Color(0xFF6366F1),
          unselectedItemColor: const Color(0xFF475569),
          selectedLabelStyle:
              GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle:
              GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 11),
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
