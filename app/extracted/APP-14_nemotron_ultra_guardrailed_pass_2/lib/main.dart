// lib/main.dart (initialization example)
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'services/ai_gateway_service.dart';

final secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    encryptedSharedPreferences: true,
    prefName: 'secure_prefs',
    masterKeyAlias: 'master_key',
  ),
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
    synchronizable: false,
  ),
);

final aiService = AiGatewayService(
  baseUrl: 'https://api.yourdomain.com', // HTTPS only, pinned in network_security_config / ATS
  secureStorage: secureStorage,
  httpClient: http.Client(),
);