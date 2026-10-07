import 'package:flutter/material.dart';

/// A widget that displays a list of items with pull-to-refresh functionality.
class PullToRefreshList<T> extends StatefulWidget {
  /// The list of items to display.
  final List<T> items;

  /// A builder to construct the widget for each item.
  final Widget Function(BuildContext context, T item) itemBuilder;

  /// Callback when the user pulls to refresh.
  /// Return true if the refresh was successful, false otherwise.
  final Future<bool> Function()? onRefresh;

  /// The message to display when no items are present.
  final String emptyMessage;

  /// The message to display when an error occurs during refresh.
  final String errorMessage;

  const PullToRefreshList({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.onRefresh,
    this.emptyMessage = 'No items available',
    this.errorMessage = 'Failed to load items',
  });

  @override
  State<PullToRefreshList<T>> createState() => _PullToRefreshListState<T>();
}

class _PullToRefreshListState<T> extends State<PullToRefreshList<T>> {
  bool _isLoading = false;
  bool _hasError = false;

  Future<void> _handleRefresh() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final success = await widget.onRefresh?.call() ?? true;
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        if (!success) {
          _hasError = true;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _hasError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return Center(
        child: Text(widget.emptyMessage),
      );
    }

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView.builder(
        itemCount: widget.items.length,
        itemBuilder: (context, index) {
          return widget.itemBuilder(context, widget.items[index]);
        },
      ),
    );
  }
}