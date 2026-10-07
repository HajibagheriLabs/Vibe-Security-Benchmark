import 'package:flutter/material.dart';
import 'package:flutter_session_storage/flutter_session_storage.dart';

void main() {
  runApp(const SessionStorageExampleApp());
}

class SessionStorageExampleApp extends StatelessWidget {
  const SessionStorageExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Session Storage Example',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const SessionStorageDemo(),
    );
  }
}

class SessionStorageDemo extends StatefulWidget {
  const SessionStorageDemo({super.key});

  @override
  State<SessionStorageDemo> createState() => _SessionStorageDemoState();
}

class _SessionStorageDemoState extends State<SessionStorageDemo> {
  final _tokenController = TextEditingController();
  final _refreshTokenController = TextEditingController();
  final _expiryController = TextEditingController();

  String? _storedToken;
  String? _storedRefreshToken;
  int? _storedExpiry;
  bool _isExpired = false;
  bool _hasToken = false;

  @override
  void initState() {
    super.initState();
    _loadStoredValues();
  }

  Future<void> _loadStoredValues() async {
    final token = await sessionStorage.getToken();
    final refreshToken = await sessionStorage.getRefreshToken();
    final expiry = await sessionStorage.getTokenExpiry();
    final isExpired = await sessionStorage.isTokenExpired();
    final hasToken = await sessionStorage.hasToken();

    setState(() {
      _storedToken = token;
      _storedRefreshToken = refreshToken;
      _storedExpiry = expiry;
      _isExpired = isExpired;
      _hasToken = hasToken;
    });
  }

  Future<void> _storeToken() async {
    final success = await sessionStorage.storeToken(_tokenController.text);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Token stored successfully')),
      );
      await _loadStoredValues();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to store token')),
      );
    }
  }

  Future<void> _storeRefreshToken() async {
    final success = await sessionStorage.storeRefreshToken(
      _refreshTokenController.text,
    );
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Refresh token stored successfully')),
      );
      await _loadStoredValues();
    }
  }

  Future<void> _storeExpiry() async {
    final expiryMs = int.tryParse(_expiryController.text);
    if (expiryMs == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid expiry timestamp')),
        );
      }
      return;
    }

    final success = await sessionStorage.storeTokenExpiry(expiryMs);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expiry stored successfully')),
      );
      await _loadStoredValues();
    }
  }

  Future<void> _clearAll() async {
    final success = await sessionStorage.clear();
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All session data cleared')),
      );
      await _loadStoredValues();
    }
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _refreshTokenController.dispose();
    _expiryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Session Storage Demo')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusSection(),
            const SizedBox(height: 24),
            _buildInputSection(),
            const SizedBox(height: 24),
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Current Status',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildStatusRow('Has Token', _hasToken ? 'Yes' : 'No'),
            _buildStatusRow('Token', _storedToken ?? 'Not set'),
            _buildStatusRow('Refresh Token', _storedRefreshToken ?? 'Not set'),
            _buildStatusRow(
              'Expiry',
              _storedExpiry != null
                  ? DateTime.fromMillisecondsSinceEpoch(_storedExpiry!).toString()
                  : 'Not set',
            ),
            _buildStatusRow('Is Expired', _isExpired ? 'Yes' : 'No'),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontFamily: 'monospace')),
          ),
        ],
      ),
    );
  }

  Widget _buildInputSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Store Values',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _tokenController,
              decoration: const InputDecoration(
                labelText: 'Auth Token',
                border: OutlineInputBorder(),
                hintText: 'Enter authentication token',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _refreshTokenController,
              decoration: const InputDecoration(
                labelText: 'Refresh Token',
                border: OutlineInputBorder(),
                hintText: 'Enter refresh token',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _expiryController,
              decoration: const InputDecoration(
                labelText: 'Token Expiry (ms since epoch)',
                border: OutlineInputBorder(),
                hintText: 'e.g., 1700000000000',
              ),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.save),
            label: const Text('Store Token'),
            onPressed: _storeToken,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.refresh),
            label: const Text('Store Refresh Token'),
            onPressed: _storeRefreshToken,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.timer),
            label: const Text('Store Expiry'),
            onPressed: _storeExpiry,
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.delete_forever),
            label: const Text('Clear All Session Data'),
            onPressed: _clearAll,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
            ),
          ),
        ),
      ],
    );
  }
}