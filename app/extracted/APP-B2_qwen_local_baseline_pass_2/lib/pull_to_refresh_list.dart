import 'package:flutter/material.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';

/// A widget that displays a list of items with pull-to-refresh functionality.
///
/// The [items] parameter provides the data to be displayed.
/// The [itemBuilder] parameter defines how each item is rendered.
/// The [onRefresh] callback is invoked when the user pulls down to refresh.
class PullToRefreshList<T> extends StatefulWidget {
  final List<T> items;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Future<void> Function()? onRefresh;

  const PullToRefreshList({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.onRefresh,
  });

  @override
  State<PullToRefreshList<T>> createState() => _PullToRefreshListState<T>();
}

class _PullToRefreshListState<T> extends State<PullToRefreshList<T>> {
  final RefreshController _refreshController =
      RefreshController(initialRefresh: false);

  void _onRefresh() async {
    if (widget.onRefresh != null) {
      try {
        await widget.onRefresh!();
        if (mounted) {
          _refreshController.refreshCompleted();
        }
      } catch (e) {
        if (mounted) {
          _refreshController.refreshFailed();
        }
      }
    } else {
      // Simulate a delay if no refresh handler is provided, for demonstration
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        _refreshController.refreshCompleted();
      }
    }
  }

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SmartRefresher(
      controller: _refreshController,
      enablePullDown: true,
      enablePullUp: false,
      onRefresh: _onRefresh,
      header: const ClassicHeader(
        complete: Text('Refresh Complete'),
        dragging: Text('Pull to refresh'),
        idle: Text('Pull to refresh'),
        trigger: Text('Release to refresh'),
      ),
      child: ListView.builder(
        itemCount: widget.items.length,
        itemBuilder: (context, index) {
          final item = widget.items[index];
          return widget.itemBuilder(context, item);
        },
      ),
    );
  }
}