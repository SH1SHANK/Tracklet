import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

class RouteProgress extends StatelessWidget {
  const RouteProgress({
    required this.stops,
    required this.currentIndex,
    super.key,
  });

  final List<String> stops;
  final int currentIndex;

  @override
  Widget build(BuildContext context) {
    if (stops.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: List.generate(
            stops.length,
            (index) {
              final isPassed = index < currentIndex;
              final isCurrent = index == currentIndex;

              return Expanded(
                child: Column(
                  children: [
                    Row(
                      children: [
                        if (index != 0)
                          const Expanded(
                            child: Divider(
                              color: AppColors.border,
                              thickness: 2,
                            ),
                          ),
                        Container(
                          width: isCurrent ? 14 : 10,
                          height: isCurrent ? 14 : 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isPassed || isCurrent
                                ? AppColors.routeActive
                                : AppColors.border,
                          ),
                        ),
                        if (index != stops.length - 1)
                          const Expanded(
                            child: Divider(
                              color: AppColors.border,
                              thickness: 2,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                      ),
                      child: Text(
                        stops[index],
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
