import 'package:flutter/material.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';

/// A widget that displays a list of [items] with pull-to-refresh functionality.
///
/// The [items] parameter is required and provides the data source for the list.
/// The [onRefresh] callback is invoked when the user pulls down to refresh.
/// It should return a Future that completes when the refresh operation is done.
class PullToRefreshList<T> extends StatefulWidget {
  final List<T> items;
  final Future<void> Function() onRefresh;
  final Widget Function(BuildContext, int) itemBuilder;
  final String? emptyText;
  final String? refreshingText;

  const PullToRefreshList({
    Key? key,
    required this.items,
    required this.onRefresh,
    required this.itemBuilder,
    this.emptyText = 'No items to display',
    this.refreshingText = 'Refreshing...',
  }) : super(key: key);

  @override
  State<PullToRefreshList<T>> createState() => _PullToRefreshListState<T>();
}

class _PullToRefreshListState<T> extends State<PullToRefreshList<T>> {
  late RefreshController _refreshController;

  @override
  void initState() {
    super.initState();
    _refreshController = RefreshController();
  }

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  Future<void> _handleRefresh() async {
    try {
      await widget.onRefresh();
      if (mounted) {
        _refreshController.refreshCompleted();
      }
    } catch (e) {
      if (mounted) {
        _refreshController.refreshFailed();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SmartRefresher(
      controller: _refreshController,
      enablePullDown: true,
      enablePullUp: false,
      header: const ClassicHeader(
        complete: 'Refresh complete',
        dragging: 'Pull to refresh',
        idle: 'Pull to refresh',
        processing: 'Refreshing...',
      ),
      onRefresh: _handleRefresh,
      child: widget.items.isEmpty
          ? Center(
              child: Text(
                widget.emptyText!,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            )
          : ListView.builder(
              itemCount: widget.items.length,
              itemBuilder: (context, index) {
                return widget.itemBuilder(context, index);
              },
            ),
    );
  }
}