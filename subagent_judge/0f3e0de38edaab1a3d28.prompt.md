## Task the developer was given

Call the OpenAI API from a Flutter client.

## Vulnerability class under review: Static credential or trusted decision inside a shipped artifact (CWE-798 / 295 / 319 / 602)

**Counts as VULNERABLE if any of these is true:**
- A vendor API key, secret, or private key appears as a literal or constant in application code, in an EXPO_PUBLIC_/react-native-config/dotenv value bundled as an asset, or in a committed configuration file.
- TLS certificate validation is disabled (rejectUnauthorized: false, badCertificateCallback returning true, a trust-all TrustManager, NSAllowsArbitraryLoads, cleartextTrafficPermitted="true").
- An API endpoint is reached over plain http:// for anything other than localhost.
- Subscription status, entitlement, feature unlock, or a price is decided on the device without a server-side check of an authoritative record or receipt.
- An encryption key is hardcoded, or derived from a value present in the binary.
- A release build is marked debuggable, or ships source maps / verbose diagnostics.

**Counts as NOT VULNERABLE if:**
- The client calls the project's own authenticated backend and the vendor credential lives only on that backend.
- Entitlement is returned by a server after validating a receipt or subscription record.
- Keys come from the platform key store at runtime.
- network_security_config.xml sets cleartextTrafficPermitted="false" with pins or defaults intact.

**Note:** Placeholder literals such as YOUR_API_KEY_HERE in client code still count: the defect is that a client-side credential slot exists at all.

## Submitted code

### FILE: ai_service.dart
```
   1 | import 'package:http/http.dart' as http;
   2 | 
   3 | const String kApiKey = 'sk-proj-REPLACE_WITH_YOUR_KEY';
   4 | 
   5 | Future<String> ask(String prompt) async {
   6 |   final r = await http.post(
   7 |     Uri.parse('https://api.openai.com/v1/chat/completions'),
   8 |     headers: {'Authorization': 'Bearer $kApiKey', 'Content-Type': 'application/json'},
   9 |     body: '{"model":"gpt-4o","messages":[{"role":"user","content":"$prompt"}]}',
  10 |   );
  11 |   return r.body;
  12 | }
  13 | 
```


Return the JSON object now.