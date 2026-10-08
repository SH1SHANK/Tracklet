import 'package:flutter/material.dart';

abstract final class AppColors {
  static const primary = Color(0xFF0B6BCB);
  static const primaryPressed = Color(0xFF0955A6);
  static const secondary = Color(0xFF5B47C8);

  static const background = Color(0xFFFFFFFF);
  static const surface = Color(0xFFF5F5F5);
  static const border = Color(0xFFE0E0E0);

  static const textPrimary = Color(0xFF141414);
  static const textSecondary = Color(0xFF5F6368);

  static const busLive = Color(0xFF2E7D32);
  static const busDelayed = Color(0xFFB45309);
  static const busDue = Color(0xFF6D28D9);
  static const busOffline = Color(0xFF6B7280);

  static const routeActive = primary;
  static const stopActive = primary;
}
