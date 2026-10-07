import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Rule Set: §1 (Storage) & §4 (Deep Links/Inputs)
/// Implementation: Uses `RefreshIndicator` for standard pull-to-refresh behavior.
/// Data is passed in via parameter (trusted source), but items are displayed securely.
/// Note: In a real app, `items` might be derived from a secure store or API.
/// Here, we assume the widget receives the data to display.

class PullToRefreshList extends StatefulWidget {
  final List<String> items;
  final Future<void> Function() onRefresh;

  const PullToRefreshList({
    super.key,
    required this.items,
    required this.onRefresh,
  });

  @override
  State<PullToRefreshList> createState() => _PullToRefreshListState();
}

class _PullToRefreshListState extends State<PullToRefreshList> {
  // Rule: §1 - Secure storage instance for potential future auth token access
  // if items were fetched dynamically.
  final _secureStorage = const FlutterSecureStorage();

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView.builder(
        itemCount: widget.items.length,
        itemBuilder: (context, index) {
          final item = widget.items[index];
          // Rule: §1 - Never log sensitive values in production
          // Assuming 'item' is safe to display, but could be a token or ID
          return ListTile(
            title: Text(item),
            subtitle: Text('Item ID: $index'),
          );
        },
      ),
    );
  }
}