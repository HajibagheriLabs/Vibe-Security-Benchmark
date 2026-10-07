import 'package:flutter/material.dart';

/// A pull-to-refresh list widget that displays items using a builder.
/// 
/// Security notes:
/// - No sensitive data persistence; purely presentational.
/// - No network calls, IPC, deep links, or crypto performed here.
/// - Caller controls item content via [itemBuilder]; ensure caller does not
///   render untrusted HTML/JS in a WebView.
class PullToRefreshList<T> extends StatefulWidget {
  /// Items to display. The widget does not mutate this list.
  final List<T> items;

  /// Builds a widget for each item at [index].
  final Widget Function(BuildContext context, int index, T item) itemBuilder;

  /// Called when the user pulls to refresh. Must return a new list or throw.
  /// The widget replaces [items] with the returned list via [onRefreshed].
  final Future<List<T>> Function() onRefresh;

  /// Callback invoked with the new list after a successful refresh.
  final void Function(List<T> newItems) onRefreshed;

  /// Optional placeholder when [items] is empty.
  final Widget? emptyWidget;

  /// Optional separator between items.
  final Widget? separator;

  const PullToRefreshList({
    super.key,
    required this.items,
    required this.itemBuilder,
    required this.onRefresh,
    required this.onRefreshed,
    this.emptyWidget,
    this.separator,
  });

  @override
  State<PullToRefreshList<T>> createState() => _PullToRefreshListState<T>();
}

class _PullToRefreshListState<T> extends State<PullToRefreshList<T>> {
  bool _isRefreshing = false;

  Future<void> _handleRefresh() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    try {
      final newItems = await widget.onRefresh();
      if (!mounted) return;
      widget.onRefreshed(newItems);
    } catch (e) {
      // Swallow exception; caller may show a SnackBar via onRefreshed side-effect.
      // Do not log sensitive data.
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _handleRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.6,
              child: Center(
                child: widget.emptyWidget ?? const Text('No items'),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: widget.items.length,
        separatorBuilder: (_, __) => widget.separator ?? const Divider(height: 1),
        itemBuilder: (context, index) => widget.itemBuilder(context, index, widget.items[index]),
      ),
    );
  }
}