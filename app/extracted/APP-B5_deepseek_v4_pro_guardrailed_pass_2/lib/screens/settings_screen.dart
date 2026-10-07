// lib/screens/settings_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Settings screen with font-size slider and live preview.
///
/// Security notes:
/// - User preference is non-sensitive UI state, but we persist it using
///   flutter_secure_storage with device-only accessibility rather than
///   shared_preferences to avoid any accidental future leakage of adjacent
///   settings that may become sensitive.
/// - No credentials, tokens, or PII are stored here.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const String _fontSizeKey = 'settings.font_size';
  static const double _minFontSize = 12.0;
  static const double _maxFontSize = 32.0;
  static const double _defaultFontSize = 16.0;

  // Secure storage configured device-only. This is a UI preference, not a
  // credential, but using the secure store avoids introducing a plaintext
  // persistence dependency and keeps the settings module consistent with the
  // project's storage rules.
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  double _fontSize = _defaultFontSize;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFontSize();
  }

  Future<void> _loadFontSize() async {
    double loadedSize = _defaultFontSize;
    try {
      final String? stored = await _storage.read(key: _fontSizeKey);
      if (stored != null) {
        final double? parsed = double.tryParse(stored);
        if (parsed != null && parsed >= _minFontSize && parsed <= _maxFontSize) {
          loadedSize = parsed;
        }
      }
    } catch (_) {
      // Degrade gracefully to default if secure storage is unavailable.
      // Never fall back to a plaintext store.
      loadedSize = _defaultFontSize;
    }

    if (!mounted) return;
    setState(() {
      _fontSize = loadedSize;
      _isLoading = false;
    });
  }

  Future<void> _saveFontSize(double value) async {
    setState(() {
      _fontSize = value;
    });

    try {
      await _storage.write(
        key: _fontSizeKey,
        value: value.toStringAsFixed(1),
      );
    } catch (_) {
      // Persistence failure does not block the in-memory preview.
      // The value remains applied for the current session only.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildSectionHeader('Display'),
                _buildFontSizeCard(),
                const SizedBox(height: 24.0),
                _buildSectionHeader('Preview'),
                _buildPreviewCard(),
              ],
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }

  Widget _buildFontSizeCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Font Size'),
                Text(
                  '${_fontSize.toStringAsFixed(1)} pt',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12.0),
            Slider(
              value: _fontSize,
              min: _minFontSize,
              max: _maxFontSize,
              divisions: ((_maxFontSize - _minFontSize) * 2).round(),
              label: _fontSize.toStringAsFixed(1),
              onChanged: _saveFontSize,
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_minFontSize.toStringAsFixed(0)} pt',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(
                  '${_maxFontSize.toStringAsFixed(0)} pt',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'The quick brown fox jumps over the lazy dog.',
              style: TextStyle(fontSize: _fontSize),
            ),
            const SizedBox(height: 12.0),
            Text(
              '1234567890',
              style: TextStyle(fontSize: _fontSize),
            ),
            const SizedBox(height: 12.0),
            Text(
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
              style: TextStyle(fontSize: _fontSize),
            ),
          ],
        ),
      ),
    );
  }
}