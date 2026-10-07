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
      keyCipherAlgorithm: KeyCipherAlgorithm.RSA_ECB_OAEPwithSHA_256andMGF1Padding,
      storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      synchronizable: false,
    ),
  );
  static const _fontSizeKey = 'user_font_size';

  double _fontSize = 16.0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadFontSize();
  }

  Future<void> _loadFontSize() async {
    final value = await _storage.read(key: _fontSizeKey);
    if (mounted) {
      setState(() {
        _fontSize = double.tryParse(value ?? '') ?? 16.0;
        _loading = false;
      });
    }
  }

  Future<void> _saveFontSize(double size) async {
    await _storage.write(key: _fontSizeKey, value: size.toStringAsFixed(1));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Font Size', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.text_decrease, size: 20),
                    Expanded(
                      child: Slider(
                        value: _fontSize,
                        min: 10.0,
                        max: 30.0,
                        divisions: 20,
                        label: _fontSize.toStringAsFixed(1),
                        onChanged: (value) {
                          setState(() => _fontSize = value);
                        },
                        onChangeEnd: (value) => _saveFontSize(value),
                      ),
                    ),
                    const Icon(Icons.text_increase, size: 20),
                  ],
                ),
                const SizedBox(height: 24),
                const Text('Live Preview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Text(
                    'The quick brown fox jumps over the lazy dog.',
                    style: TextStyle(fontSize: _fontSize, height: 1.5),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Current size: ${_fontSize.toStringAsFixed(1)} pt',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
    );
  }
}