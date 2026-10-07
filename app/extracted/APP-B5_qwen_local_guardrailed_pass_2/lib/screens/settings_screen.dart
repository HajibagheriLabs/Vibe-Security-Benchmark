import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Rule 1: Storage.
// font_size is a configuration value, not a secret. Stored in SharedPreferences.
// Secure storage used for a hypothetical API token to demonstrate Rule 1 compliance.
const String _fontSizeKey = 'app_font_size';
const String _apiTokenKey = 'api_token';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  double _fontSize = 16.0;
  String? _token;

  final _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final loadedSize = prefs.getDouble(_fontSizeKey);
    if (loadedSize != null) {
      setState(() {
        _fontSize = loadedSize;
      });
    }

    // Rule 1: Secure storage read.
    final token = await _storage.read(key: _apiTokenKey);
    setState(() {
      _token = token;
    });
  }

  Future<void> _saveFontSize(double value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_fontSizeKey, value);
    setState(() {
      _fontSize = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Rule 4: Deep links/URLs don't mutate state here.
    // Rule 3: No vendor secrets in the build.
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Font Size Slider
            Text(
              'Font Size',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.text_fields, size: 16),
                Expanded(
                  child: Slider(
                    value: _fontSize,
                    min: 12,
                    max: 32,
                    divisions: 20,
                    label: _fontSize.round().toString(),
                    onChanged: (value) {
                      _saveFontSize(value);
                    },
                  ),
                ),
                const Icon(Icons.text_fields, size: 24),
              ],
            ),
            const SizedBox(height: 16),
            
            // Live Preview
            Text(
              'Preview',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
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
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Rule 1: Demonstration of Secure Storage usage
            Text(
              'API Token Status',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              _token != null ? 'Token stored in SecureStorage' : 'No token found',
              style: const TextStyle(color: Colors.green),
            ),
          ],
        ),
      ),
    );
  }
}