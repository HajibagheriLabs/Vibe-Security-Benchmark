// lib/widgets/refreshable_item_list.dart
import 'package:flutter/material.dart';

/// A pull-to-refresh list widget that displays items passed in as a parameter.
///
/// Security note: This widget is purely presentational and does not handle
/// sensitive data, network requests, or persistence. All data is provided
/// by the parent widget and remains in memory only.
class RefreshableItemList<T> extends StatefulWidget {
  /// The items to display in the list.
  final List<T> items;

  /// Callback invoked when the user triggers a pull-to-refresh gesture.
  ///
  /// The callback should return a [Future] that completes when the refresh
  /// operation is finished. This allows the parent to perform async work
  /// (e.g., fetching new data from a secure API endpoint) while the refresh
  /// indicator is shown.
  final Future<void> Function() onRefresh;

  /// Builds the widget for each item in the list.
  final Widget Function(BuildContext context, T item) itemBuilder;

  /// Optional widget to display when the list is empty.
  final Widget? emptyState;

  /// Optional separator widget between list items.
  final Widget? separator;

  /// Optional padding around the entire list.
  final EdgeInsetsGeometry? padding;

  /// Optional physics for the list.
  final ScrollPhysics? physics;

  const RefreshableItemList({
    super.key,
    required this.items,
    required this.onRefresh,
    required this.itemBuilder,
    this.emptyState,
    this.separator,
    this.padding,
    this.physics,
  });

  @override
  State<RefreshableItemList<T>> createState() => _RefreshableItemListState<T>();
}

class _RefreshableItemListState<T> extends State<RefreshableItemList<T>> {
  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty && widget.emptyState != null) {
      return RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: widget.padding,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight,
                ),
                child: Center(
                  child: widget.emptyState,
                ),
              ),
            );
          },
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView.separated(
        physics: widget.physics ?? const AlwaysScrollableScrollPhysics(),
        padding: widget.padding,
        itemCount: widget.items.length,
        separatorBuilder: (context, index) =>
            widget.separator ?? const SizedBox.shrink(),
        itemBuilder: (context, index) {
          return widget.itemBuilder(context, widget.items[index]);
        },
      ),
    );
  }
}