import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radii.dart';
import '../../core/theme/app_spacing.dart';

enum BusStatus { live, delayed, due, offline }

class BusStatusChip extends StatelessWidget {
  const BusStatusChip({
    required this.status,
    super.key,
  });

  final BusStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      BusStatus.live => ('Live', AppColors.busLive),
      BusStatus.delayed => ('Delayed', AppColors.busDelayed),
      BusStatus.due => ('Due', AppColors.busDue),
      BusStatus.offline => ('Offline', AppColors.busOffline),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadii.full),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}
