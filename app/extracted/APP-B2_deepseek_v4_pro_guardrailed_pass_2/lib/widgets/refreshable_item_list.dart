// lib/widgets/refreshable_item_list.dart
import 'package:flutter/material.dart';

/// A pull-to-refresh list widget that displays items passed as a parameter.
///
/// Security note: This widget renders only display data provided by the caller.
/// It performs no network access, persistence, or deep-link handling itself.
/// Any sensitive data must be fetched and sanitized by the parent using the
/// application's authenticated gateway before being passed here.
class RefreshableItemList<T> extends StatefulWidget {
  /// The items to display in the list.
  final List<T> items;

  /// Callback invoked when the user triggers a pull-to-refresh gesture.
  ///
  /// The callback is expected to return a [Future] that completes when the
  /// refresh operation finishes. The widget shows the refresh indicator until
  /// the future resolves.
  final Future<void> Function() onRefresh;

  /// Builds the visual representation for a single item.
  final Widget Function(BuildContext context, T item) itemBuilder;

  /// Optional widget displayed when [items] is empty.
  final Widget? emptyState;

  /// Optional separator builder between list items.
  final Widget Function(BuildContext context, int index)? separatorBuilder;

  /// Optional padding around the list.
  final EdgeInsetsGeometry? padding;

  /// Optional physics for the scroll view.
  final ScrollPhysics? physics;

  const RefreshableItemList({
    super.key,
    required this.items,
    required this.onRefresh,
    required this.itemBuilder,
    this.emptyState,
    this.separatorBuilder,
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
        separatorBuilder: widget.separatorBuilder ??
            (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          return widget.itemBuilder(context, widget.items[index]);
        },
      ),
    );
  }
}