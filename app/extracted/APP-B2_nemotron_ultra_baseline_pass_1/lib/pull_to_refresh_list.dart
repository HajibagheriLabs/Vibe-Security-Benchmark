import 'package:flutter/material.dart';

/// A pull-to-refresh list widget that displays a list of items and supports
/// refreshing via pull-to-refresh gesture.
class PullToRefreshList<T> extends StatefulWidget {
  /// The list of items to display.
  final List<T> items;

  /// A builder function to create a widget for each item.
  final Widget Function(BuildContext context, T item, int index) itemBuilder;

  /// Callback triggered when the user pulls to refresh.
  /// Should return a Future that completes when the refresh operation is done.
  final Future<void> Function() onRefresh;

  /// Optional separator builder for dividers between items.
  final Widget Function(BuildContext context, int index)? separatorBuilder;

  /// Optional padding around the list.
  final EdgeInsetsGeometry? padding;

  /// Optional physics for the scroll view.
  final ScrollPhysics? physics;

  /// Optional background color for the refresh indicator.
  final Color? refreshIndicatorColor;

  /// Optional background color for the refresh indicator's background.
  final Color? refreshIndicatorBackgroundColor;

  /// Optional displacement of the refresh indicator.
  final double displacement;

  /// Optional semantics label for accessibility.
  final String? refreshIndicatorSemanticsLabel;

  /// Optional semantics value for accessibility.
  final String? refreshIndicatorSemanticsValue;

  const PullToRefreshList({
    super.key,
    required this.items,
    required this.itemBuilder,
    required this.onRefresh,
    this.separatorBuilder,
    this.padding,
    this.physics,
    this.refreshIndicatorColor,
    this.refreshIndicatorBackgroundColor,
    this.displacement = 40.0,
    this.refreshIndicatorSemanticsLabel,
    this.refreshIndicatorSemanticsValue,
  });

  @override
  State<PullToRefreshList<T>> createState() => _PullToRefreshListState<T>();
}

class _PullToRefreshListState<T> extends State<PullToRefreshList<T>> {
  Future<void>? _refreshFuture;

  Future<void> _handleRefresh() async {
    final future = widget.onRefresh();
    setState(() {
      _refreshFuture = future;
    });
    try {
      await future;
    } finally {
      if (mounted) {
        setState(() {
          _refreshFuture = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final listView = widget.separatorBuilder != null
        ? ListView.separated(
            padding: widget.padding,
            physics: widget.physics ?? const AlwaysScrollableScrollPhysics(),
            itemCount: widget.items.length,
            itemBuilder: (context, index) =>
                widget.itemBuilder(context, widget.items[index], index),
            separatorBuilder: widget.separatorBuilder!,
          )
        : ListView.builder(
            padding: widget.padding,
            physics: widget.physics ?? const AlwaysScrollableScrollPhysics(),
            itemCount: widget.items.length,
            itemBuilder: (context, index) =>
                widget.itemBuilder(context, widget.items[index], index),
          );

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: widget.refreshIndicatorColor,
      backgroundColor: widget.refreshIndicatorBackgroundColor,
      displacement: widget.displacement,
      semanticsLabel: widget.refreshIndicatorSemanticsLabel,
      semanticsValue: widget.refreshIndicatorSemanticsValue,
      child: listView,
    );
  }
}