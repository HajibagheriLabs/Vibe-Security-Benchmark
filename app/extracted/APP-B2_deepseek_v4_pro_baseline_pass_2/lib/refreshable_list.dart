import 'package:flutter/material.dart';

/// A pull-to-refresh list widget that displays items passed in as a parameter.
///
/// The list supports pull-to-refresh via [RefreshIndicator] and displays
/// items using a [ListView.builder] for efficient rendering of long lists.
class RefreshableList<T> extends StatefulWidget {
  /// The list of items to display.
  final List<T> items;

  /// Callback invoked when the user triggers a pull-to-refresh.
  ///
  /// This callback should perform the refresh operation and return a
  /// [Future] that completes when the refresh is finished.
  final Future<void> Function() onRefresh;

  /// Builder function that creates a widget for each item in the list.
  final Widget Function(BuildContext context, T item, int index) itemBuilder;

  /// Optional separator builder between list items.
  final Widget Function(BuildContext context, int index)? separatorBuilder;

  /// Optional padding around the list.
  final EdgeInsetsGeometry? padding;

  /// The scroll direction of the list.
  final Axis scrollDirection;

  /// Whether the list should reverse the scroll direction.
  final bool reverse;

  /// The scroll controller for the list.
  final ScrollController? controller;

  /// The physics of the scroll view.
  final ScrollPhysics? physics;

  /// Whether to shrink wrap the list.
  final bool shrinkWrap;

  /// Whether to always use a scrollbar.
  final bool showScrollbar;

  /// Creates a [RefreshableList] widget.
  const RefreshableList({
    super.key,
    required this.items,
    required this.onRefresh,
    required this.itemBuilder,
    this.separatorBuilder,
    this.padding,
    this.scrollDirection = Axis.vertical,
    this.reverse = false,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
    this.showScrollbar = false,
  });

  @override
  State<RefreshableList<T>> createState() => _RefreshableListState<T>();
}

class _RefreshableListState<T> extends State<RefreshableList<T>> {
  @override
  Widget build(BuildContext context) {
    final listView = ListView.separated(
      controller: widget.controller,
      scrollDirection: widget.scrollDirection,
      reverse: widget.reverse,
      physics: widget.physics ?? const AlwaysScrollableScrollPhysics(),
      shrinkWrap: widget.shrinkWrap,
      padding: widget.padding,
      itemCount: widget.items.length,
      itemBuilder: (context, index) {
        return widget.itemBuilder(context, widget.items[index], index);
      },
      separatorBuilder: widget.separatorBuilder != null
          ? (context, index) => widget.separatorBuilder!(context, index)
          : (context, index) => const SizedBox.shrink(),
    );

    final scrollableList = widget.showScrollbar
        ? Scrollbar(
            controller: widget.controller,
            child: listView,
          )
        : listView;

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: scrollableList,
    );
  }
}