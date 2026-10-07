// lib/settings_screen.dart
import 'package:flutter/material.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  double _fontSize = 16.0;
  static const double _minFontSize = 12.0;
  static const double _maxFontSize = 32.0;

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
            const Text(
              'Font Size',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.text_fields,
                  size: _minFontSize,
                  color: Colors.grey.shade600,
                ),
                Expanded(
                  child: Slider(
                    value: _fontSize,
                    min: _minFontSize,
                    max: _maxFontSize,
                    divisions: ((_maxFontSize - _minFontSize) * 2).round(),
                    label: _fontSize.toStringAsFixed(1),
                    onChanged: (value) {
                      setState(() {
                        _fontSize = value;
                      });
                    },
                  ),
                ),
                Icon(
                  Icons.text_fields,
                  size: _maxFontSize,
                  color: Colors.grey.shade600,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Center(
              child: Text(
                '${_fontSize.toStringAsFixed(1)} px',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            const Text(
              'Preview',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'The quick brown fox jumps over the lazy dog.',
                    style: TextStyle(fontSize: _fontSize),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                    style: TextStyle(
                      fontSize: _fontSize * 0.85,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Numbers: 1234567890',
                    style: TextStyle(
                      fontSize: _fontSize * 0.75,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}