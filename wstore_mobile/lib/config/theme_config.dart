import 'package:flutter/material.dart';

class AppColors {
  static const bool isLight = true;

  static const Color primary = Color(0xFF6366F1); // Indigo 500
  static const Color secondary = Color(0xFFA855F7); // Purple 500

  static const Color background =
      Color(0xFFF8FAFC); // Slate 50 (Clean off-white)
  static const Color surface = Colors.white; // Pure white surfaces
  static const Color border =
      Color(0xFFE2E8F0); // Slate 200 (Subtle divide borders)

  static const Color textPrimary =
      Color(0xFF0F172A); // Slate 900 (Dark crisp texts)
  static const Color textSecondary =
      Color(0xFF475569); // Slate 600 (Dark grey subtexts)
  static const Color textMuted =
      Color(0xFF94A3B8); // Slate 400 (Soft grey hints)

  // Opacity variants of textPrimary
  static const Color textPrimary10 = Color(0x1A0F172A); // 10% opacity
  static const Color textPrimary12 = Color(0x1F0F172A); // 12% opacity
  static const Color textPrimary24 = Color(0x3D0F172A); // 24% opacity
  static const Color textPrimary54 = Color(0x8A0F172A); // 54% opacity
  static const Color textPrimary60 = Color(0x990F172A); // 60% opacity
  static const Color textPrimary70 = Color(0xB30F172A); // 70% opacity

  static const Color cardBg = Colors.white;
  static const Color inputBg = Color(0xFFF1F5F9); // Slate 100

  static const Color cardBorder =
      Color(0x0F000000); // Colors.black.withOpacity(0.06)
  static const Color cardOpacityBg =
      Color(0x08000000); // Colors.black.withOpacity(0.03)
}
