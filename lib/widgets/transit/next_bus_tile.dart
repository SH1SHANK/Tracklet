import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radii.dart';
import '../../core/theme/app_spacing.dart';
import 'bus_status_chip.dart';

class NextBusTile extends StatelessWidget {
  const NextBusTile({
    required this.routeNumber,
    required this.destination,
    required this.eta,
    required this.departure,
    super.key,
    this.status = BusStatus.live,
  });

  final String routeNumber;
  final String destination;
  final String eta;
  final String departure;
  final BusStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(AppRadii.sm),
            ),
            child: Text(
              routeNumber,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontFeatures: AppTypographyNumeric.features,
                  ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  destination,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  departure,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                eta,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontFeatures: AppTypographyNumeric.features,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              BusStatusChip(status: status),
            ],
          ),
        ],
      ),
    );
  }
}

abstract final class AppTypographyNumeric {
  static const features = <FontFeature>[
    FontFeature.tabularFigures(),
  ];
}
