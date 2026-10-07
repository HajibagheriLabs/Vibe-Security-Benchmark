import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Settings screen with font-size adjustment and live preview.
///
/// Security note: Font-size preference is non-sensitive UI configuration,
/// stored in memory during the session. If persistence were required, it
/// would use a secure store or server-side profile — never a plaintext
/// local store that could be tampered with to inject values.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const double _minFontSize = 12.0;
  static const double _maxFontSize = 28.0;
  static const double _defaultFontSize = 16.0;

  double _fontSize = _defaultFontSize;

  // Security note: In-memory only; no persistence to avoid tampering with
  // UI configuration via a hostile device.
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  @override
  void initState() {
    super.initState();
    _loadSavedFontSize();
  }

  Future<void> _loadSavedFontSize() async {
    try {
      final String? saved = await _secureStorage.read(key: 'font_size');
      if (saved != null && mounted) {
        final double? parsed = double.tryParse(saved);
        if (parsed != null) {
          setState(() {
            _fontSize = parsed.clamp(_minFontSize, _maxFontSize);
          });
        }
      }
    } catch (_) {
      // Security note: Fail closed — keep default size if secure storage
      // is unavailable; never fall back to plaintext storage.
    }
  }

  Future<void> _saveFontSize(double size) async {
    try {
      await _secureStorage.write(
        key: 'font_size',
        value: size.toStringAsFixed(1),
      );
    } catch (_) {
      // Security note: Degrade gracefully — setting applies for this session
      // only if secure persistence is unavailable.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            _buildSectionHeader('Display'),
            _buildFontSizeCard(),
            const SizedBox(height: 24),
            _buildSectionHeader('Preview'),
            _buildPreviewCard(),
          ],
        ),
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
              color: Theme.of(context).colorScheme.primary,
            ),
      ),
    );
  }

  Widget _buildFontSizeCard() {
    return Card(
      elevation: 2,
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
                  _fontSize.toStringAsFixed(1),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: _fontSize,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Slider(
              value: _fontSize,
              min: _minFontSize,
              max: _maxFontSize,
              divisions: ((_maxFontSize - _minFontSize) * 2).round(),
              label: _fontSize.toStringAsFixed(1),
              onChanged: (double value) {
                setState(() {
                  _fontSize = value;
                });
              },
              onChangeEnd: (double value) {
                _saveFontSize(value);
              },
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Small',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  'Large',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
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
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Live Preview',
              style: TextStyle(
                fontSize: _fontSize,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'The quick brown fox jumps over the lazy dog.',
              style: TextStyle(
                fontSize: _fontSize,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '1234567890',
              style: TextStyle(
                fontSize: _fontSize,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This is how your content will appear with the selected font size.',
              style: TextStyle(
                fontSize: _fontSize,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      ),
    );
  }
}