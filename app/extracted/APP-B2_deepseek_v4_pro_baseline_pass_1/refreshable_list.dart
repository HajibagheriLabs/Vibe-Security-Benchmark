// refreshable_list.dart
import 'package:flutter/material.dart';

/// A widget that displays a pull-to-refresh list of items.
///
/// The [items] parameter is a list of widgets to display in the list.
/// The [onRefresh] callback is called when the user triggers a pull-to-refresh.
class RefreshableList extends StatelessWidget {
  /// The list of items to display.
  final List<Widget> items;

  /// Callback invoked when the user pulls to refresh.
  final Future<void> Function() onRefresh;

  /// Creates a [RefreshableList] widget.
  const RefreshableList({
    super.key,
    required this.items,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        children: items,
      ),
    );
  }
}