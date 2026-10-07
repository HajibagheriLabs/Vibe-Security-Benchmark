// lib/settings_screen.dart
import 'package:flutter/material.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Rule 1: Font size stored in SharedPreferences (cleartext), but safe for UI config.
  // Rule 4: No deep links or sensitive auth data here.
  static const double _minFontSize = 12.0;
  static const double _maxFontSize = 30.0;
  
  double _fontSize = 16.0;

  @override
  void initState() {
    super.initState();
    // In a real app, load from secure store or shared preferences here
    // _loadFontSize();
  }

  void _updateFontSize(double value) {
    setState(() {
      _fontSize = value;
    });
  }

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
            const SizedBox(height: 20),
            Slider(
              value: _fontSize,
              min: _minFontSize,
              max: _maxFontSize,
              divisions: 18, // (30-12)/1 = 18 steps
              label: _fontSize.toStringAsFixed(1),
              onChanged: _updateFontSize,
            ),
            const SizedBox(height: 40),
            Text(
              'Preview',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 10),
            // Live preview widget
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'The quick brown fox jumps over the lazy dog.',
                style: TextStyle(
                  fontSize: _fontSize,
                  fontFamily: 'Roboto', // Default Flutter font
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}