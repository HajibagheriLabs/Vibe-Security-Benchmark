import 'package:flutter/material.dart';

/// A pull-to-refresh list widget that displays items with a refresh indicator.
///
/// The widget takes a list of items and a builder function to render each item.
/// The onRefresh callback is required and should handle the data fetching logic.
class PullToRefreshList<T> extends StatelessWidget {
  const PullToRefreshList({
    super.key,
    required this.items,
    required this.itemBuilder,
    required this.onRefresh,
    this.refreshIndicatorColor,
    this.backgroundColor,
    this.semanticLabel = 'Pull to refresh',
  });

  /// The list of items to display.
  final List<T> items;

  /// Builder function to create a widget for each item.
  final Widget Function(BuildContext context, int index, T item) itemBuilder;

  /// Callback triggered when the user pulls to refresh.
  /// Must return a Future that completes when the refresh operation finishes.
  final Future<void> Function() onRefresh;

  /// The color of the refresh indicator.
  final Color? refreshIndicatorColor;

  /// The background color of the list.
  final Color? backgroundColor;

  /// Semantic label for accessibility.
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: refreshIndicatorColor,
      backgroundColor: backgroundColor,
      semanticsLabel: semanticLabel,
      semanticsValue: null,
      child: items.isEmpty
          ? _EmptyListView(
              semanticLabel: semanticLabel,
              onRefresh: onRefresh,
            )
          : ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: items.length,
              itemBuilder: (context, index) {
                return itemBuilder(context, index, items[index]);
              },
            ),
    );
  }
}

/// A ListView that allows pull-to-refresh even when empty.
class _EmptyListView extends StatelessWidget {
  const _EmptyListView({
    required this.semanticLabel,
    required this.onRefresh,
  });

  final String semanticLabel;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: const Center(
            child: Text('No items to display'),
          ),
        ),
      ],
    );
  }
}