import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      prefName: 'app_settings',
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      synchronizable: false,
    ),
  );

  static const _fontSizeKey = 'font_size';
  static const double _minFontSize = 12.0;
  static const double _maxFontSize = 28.0;
  static const double _defaultFontSize = 16.0;

  double _fontSize = _defaultFontSize;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFontSize();
  }

  Future<void> _loadFontSize() async {
    try {
      final value = await _storage.read(key: _fontSizeKey);
      if (value != null) {
        final parsed = double.tryParse(value);
        if (parsed != null && parsed >= _minFontSize && parsed <= _maxFontSize) {
          setState(() => _fontSize = parsed);
        }
      }
    } catch (_) {
      // Secure storage unavailable; keep default
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveFontSize(double size) async {
    try {
      await _storage.write(key: _fontSizeKey, value: size.toStringAsFixed(1));
    } catch (_) {
      // Persistence failed; in-memory value still applied
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Font Size',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Slider(
                  value: _fontSize,
                  min: _minFontSize,
                  max: _maxFontSize,
                  divisions: ((_maxFontSize - _minFontSize) / 0.5).round(),
                  label: '${_fontSize.toStringAsFixed(1)}pt',
                  onChanged: (value) {
                    setState(() => _fontSize = value);
                    _saveFontSize(value);
                  },
                ),
                const SizedBox(height: 24),
                const Text(
                  'Live Preview',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outlineVariant,
                    ),
                  ),
                  child: Text(
                    'The quick brown fox jumps over the lazy dog. 0123456789',
                    style: TextStyle(fontSize: _fontSize, height: 1.5),
                  ),
                ),
              ],
            ),
    );
  }
}