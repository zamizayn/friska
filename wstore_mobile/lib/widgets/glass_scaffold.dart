import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme_config.dart';

class GlassScaffold extends StatelessWidget {
  final Widget body;
  final String? title;
  final Widget? titleWidget;
  final Widget? leading;
  final List<Widget>? actions;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final Widget? drawer;
  final bool noAppBar;
  final TabBar? bottom;

  const GlassScaffold({
    super.key,
    required this.body,
    this.title,
    this.titleWidget,
    this.leading,
    this.actions,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.drawer,
    this.noAppBar = false,
    this.bottom,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      drawer: drawer,
      appBar: noAppBar
          ? null
          : AppBar(
              backgroundColor: AppColors.surface,
              elevation: 0.5,
              title: titleWidget ??
                  (title != null
                      ? Text(title!,
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppColors.textPrimary,
                          ))
                      : null),
              leading: leading ??
                  (drawer != null
                      ? Builder(
                          builder: (context) => IconButton(
                            icon: const Icon(Icons.menu,
                                color: AppColors.textPrimary),
                            onPressed: () =>
                                Scaffold.of(context).openDrawer(),
                          ),
                        )
                      : Navigator.of(context).canPop()
                          ? IconButton(
                              icon: const Icon(Icons.arrow_back,
                                  color: AppColors.textPrimary),
                              onPressed: () => Navigator.pop(context),
                            )
                          : null),
              actions: actions,
              bottom: bottom,
            ),
      body: SafeArea(child: body),
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
    );
  }
}
