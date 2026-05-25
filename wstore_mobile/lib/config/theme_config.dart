import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color cardBg = Colors.white;
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color cardOpacityBg = Color(0xFFF1F5F9);
  static const Color inputBg = Color(0xFFF1F5F9);
  static const Color border = Color(0xFFE2E8F0);

  static const Color accent = Color(0xFF6366F1);
  static const Color accentLight = Color(0xFF818CF8);
  static const Color accentBg = Color(0xFFEEF2FF);

  static const Color green = Color(0xFF10B981);
  static const Color greenLight = Color(0xFFD1FAE5);
  static const Color red = Color(0xFFEF4444);
  static const Color redLight = Color(0xFFFEE2E2);
  static const Color amber = Color(0xFFF59E0B);
  static const Color amberLight = Color(0xFFFEF3C7);
  static const Color blue = Color(0xFF3B82F6);
  static const Color blueLight = Color(0xFFDBEAFE);

  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textPrimary54 = Color(0x8A0F172A);
  static const Color textPrimary60 = Color(0x990F172A);
  static const Color textPrimary70 = Color(0xB30F172A);
  static const Color textPrimary24 = Color(0x3D0F172A);
  static const Color textPrimary12 = Color(0x1F0F172A);
  static const Color textPrimary10 = Color(0x1A0F172A);
}

class GlassStyles {
  static BoxDecoration card({
    double radius = 16,
    Color? color,
    Color? borderColor,
    List<BoxShadow>? shadows,
  }) {
    return BoxDecoration(
      color: color ?? AppColors.cardBg,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor ?? AppColors.cardBorder),
      boxShadow: shadows ??
          [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
    );
  }

  static BoxDecoration input({
    double radius = 12,
    Color? color,
    Color? borderColor,
  }) {
    return BoxDecoration(
      color: color ?? AppColors.inputBg,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor ?? AppColors.cardBorder),
    );
  }

  static BoxDecoration button({
    double radius = 12,
    bool primary = true,
  }) {
    return BoxDecoration(
      borderRadius: BorderRadius.circular(radius),
      color: primary ? AppColors.accent : AppColors.green,
      boxShadow: [
        BoxShadow(
          color: (primary ? AppColors.accent : AppColors.green)
              .withOpacity(0.2),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }
}

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double radius;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.radius = 16,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(radius),
          child: Container(
            padding: padding ?? const EdgeInsets.all(16),
            decoration: GlassStyles.card(radius: radius),
            child: child,
          ),
        ),
      ),
    );
  }
}

class GlassInput extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool obscure;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final double radius;
  final ValueChanged<String>? onChanged;

  const GlassInput({
    super.key,
    required this.controller,
    required this.hint,
    this.keyboardType,
    this.maxLines = 1,
    this.obscure = false,
    this.prefixIcon,
    this.suffixIcon,
    this.radius = 12,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: GlassStyles.input(radius: radius),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        maxLines: maxLines,
        onChanged: onChanged,
        style: const TextStyle(
          fontFamily: 'Inter',
          color: AppColors.textPrimary,
          fontSize: 14,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(
            fontFamily: 'Inter',
            color: AppColors.textMuted,
          ),
          prefixIcon: prefixIcon,
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }
}

class GlassButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final bool primary;

  const GlassButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.primary = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: GlassStyles.button(primary: primary),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: const TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class GlassChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? selectedColor;

  const GlassChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.selectedColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = selectedColor ?? AppColors.accent;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.1)
              : AppColors.cardOpacityBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color.withOpacity(0.3) : AppColors.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Outfit',
            color: selected ? color : AppColors.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

extension StatusColor on String {
  Color get statusColor {
    switch (toLowerCase()) {
      case 'pending':
        return AppColors.amber;
      case 'shipped':
        return AppColors.blue;
      case 'delivered':
        return AppColors.green;
      case 'cancelled':
      case 'cancelled':
        return AppColors.red;
      case 'paid':
        return AppColors.green;
      case 'unpaid':
        return AppColors.red;
      case 'resolved':
        return AppColors.green;
      default:
        return AppColors.textSecondary;
    }
  }
}
