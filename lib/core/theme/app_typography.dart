import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class AppTypography {
  static TextTheme get textTheme {
    final base = GoogleFonts.dmSansTextTheme();

    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: const Color(0xFF141414),
      ),
      headlineLarge: base.headlineLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: const Color(0xFF141414),
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontWeight: FontWeight.w700,
        color: const Color(0xFF141414),
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: const Color(0xFF141414),
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF141414),
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        color: const Color(0xFF141414),
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        color: const Color(0xFF5F6368),
      ),
      labelLarge: base.labelLarge?.copyWith(
        fontWeight: FontWeight.w600,
      ),
    );
  }

  static const numericFeatures = <FontFeature>[
    FontFeature.tabularFigures(),
  ];
}
