import 'package:flutter/material.dart';

/// A reusable pull-to-refresh list widget.
///
/// Displays a [ListView] with a [RefreshIndicator] that triggers the
/// [onRefresh] callback when pulled down. The list renders [items] using
/// [itemBuilder].
class PullToRefreshList<T> extends StatelessWidget {
  /// The items to display in the list.
  final List<T> items;

  /// Called when the user pulls to refresh. Must return a [Future] that
  /// completes when the refresh operation finishes.
  final Future<void> Function() onRefresh;

  /// Builds a widget for each item in the list.
  final Widget Function(BuildContext context, T item, int index) itemBuilder;

  /// Optional separator widget between items.
  final Widget? separator;

  /// Optional padding around the list content.
  final EdgeInsetsGeometry? padding;

  /// Optional background color of the list.
  final Color? backgroundColor;

  /// Optional displacement of the refresh indicator from the top.
  final double displacement;

  /// Optional color of the refresh indicator.
  final Color? color;

  /// Optional background color of the refresh indicator.
  final Color? backgroundColorIndicator;

  /// Creates a pull-to-refresh list.
  const PullToRefreshList({
    super.key,
    required this.items,
    required this.onRefresh,
    required this.itemBuilder,
    this.separator,
    this.padding,
    this.backgroundColor,
    this.displacement = 40.0,
    this.color,
    this.backgroundColorIndicator,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      displacement: displacement,
      color: color,
      backgroundColor: backgroundColorIndicator,
      child: ListView.separated(
        padding: padding,
        itemCount: items.length,
        separatorBuilder: separator != null
            ? (context, index) => separator!
            : (context, index) => const SizedBox.shrink(),
        itemBuilder: (context, index) {
          return itemBuilder(context, items[index], index);
        },
      ),
    );
  }
}