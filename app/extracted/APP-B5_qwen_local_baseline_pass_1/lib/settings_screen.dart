import 'package:flutter/material.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  double _fontSize = 16.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Font Size',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Current Size: ${_fontSize.toStringAsFixed(1)}px',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Slider(
              value: _fontSize,
              min: 8.0,
              max: 48.0,
              divisions: 40,
              label: _fontSize.toStringAsFixed(0),
              onChanged: (value) {
                setState(() {
                  _fontSize = value;
                });
              },
            ),
            const SizedBox(height: 32),
            const Text(
              'Live Preview',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'The quick brown fox jumps over the lazy dog.',
                style: TextStyle(fontSize: _fontSize),
              ),
            ),
          ],
        ),
      ),
    );
  }
}