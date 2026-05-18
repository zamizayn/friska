import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

// Services
import 'services/storage_service.dart';

// Providers
import 'providers/auth_provider.dart';
import 'providers/branches_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/orders_provider.dart';
import 'providers/products_provider.dart';
import 'providers/categories_provider.dart';
import 'providers/customers_provider.dart';
import 'providers/offers_provider.dart';
import 'providers/support_provider.dart';

import 'config/theme_config.dart';

// Views
import 'views/onboarding/landing_screen.dart';
import 'views/dashboard/dashboard_layout.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  runApp(const WStoreApp());
}

class WStoreApp extends StatelessWidget {
  const WStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => BranchesProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => OrdersProvider()),
        ChangeNotifierProvider(create: (_) => ProductsProvider()),
        ChangeNotifierProvider(create: (_) => CategoriesProvider()),
        ChangeNotifierProvider(create: (_) => CustomersProvider()),
        ChangeNotifierProvider(create: (_) => OffersProvider()),
        ChangeNotifierProvider(create: (_) => SupportProvider()),
      ],
      child: MaterialApp(
        title: 'Friska',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.light,
          primaryColor: AppColors.primary,
          scaffoldBackgroundColor: AppColors.background,
          cardColor: AppColors.cardBg,
          dialogBackgroundColor: AppColors.surface,
          dividerColor: AppColors.border,
          textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.surface,
            elevation: 0.5,
            iconTheme: IconThemeData(color: AppColors.textPrimary),
            titleTextStyle: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: AppColors.surface,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.textMuted,
            elevation: 8,
          ),
          colorScheme: const ColorScheme.light(
            primary: AppColors.primary,
            secondary: AppColors.secondary,
            surface: AppColors.surface,
            onSurface: AppColors.textPrimary,
            background: AppColors.background,
          ),
        ),
        home: const AppLoader(),
      ),
    );
  }
}

class AppLoader extends StatelessWidget {
  const AppLoader({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // If authenticated, navigate straight to Dashboard Shell.
    // Otherwise, direct the user to the interactive welcome landing wizards.
    if (auth.isAuthenticated) {
      return const DashboardLayout();
    } else {
      return const LandingScreen();
    }
  }
}
