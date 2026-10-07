import 'package:flutter/material.dart';
import 'refreshable_list.dart';

/// Example usage of the [RefreshableList] widget.
class ExampleScreen extends StatefulWidget {
  const ExampleScreen({super.key});

  @override
  State<ExampleScreen> createState() => _ExampleScreenState();
}

class _ExampleScreenState extends State<ExampleScreen> {
  List<String> _items = List.generate(20, (index) => 'Item ${index + 1}');

  Future<void> _handleRefresh() async {
    // Simulate a network request or data fetch.
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      setState(() {
        _items = List.generate(
          20,
          (index) => 'Item ${index + 1} (refreshed at '
              '${DateTime.now().toIso8601String()})',
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Refreshable List Example'),
      ),
      body: RefreshableList<String>(
        items: _items,
        onRefresh: _handleRefresh,
        itemBuilder: (context, item, index) {
          return ListTile(
            leading: CircleAvatar(
              child: Text('${index + 1}'),
            ),
            title: Text(item),
            subtitle: const Text('Pull down to refresh'),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Tapped: $item')),
              );
            },
          );
        },
        separatorBuilder: (context, index) => const Divider(height: 1),
        padding: const EdgeInsets.symmetric(vertical: 8),
      ),
    );
  }
}