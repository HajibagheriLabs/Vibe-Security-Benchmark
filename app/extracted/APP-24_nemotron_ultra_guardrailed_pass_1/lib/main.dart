import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CropApp());
}

class CropApp extends StatelessWidget {
  const CropApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Secure Image Crop',
      theme: ThemeData(useMaterial3: true),
      home: const CropScreen(),
    );
  }
}

class CropScreen extends StatefulWidget {
  const CropScreen({super.key});

  @override
  State<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends State<CropScreen> {
  final ImagePicker _picker = ImagePicker();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      synchronizable: false,
    ),
  );

  File? _originalImage;
  File? _croppedImage;
  bool _isProcessing = false;
  String? _error;

  Future<void> _pickAndCropImage() async {
    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );

      if (pickedFile == null) {
        setState(() => _isProcessing = false);
        return;
      }

      final File imageFile = File(pickedFile.path);
      setState(() => _originalImage = imageFile);

      final CroppedFile? croppedFile = await ImageCropper().cropImage(
        sourcePath: imageFile.path,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 90,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Image',
            toolbarColor: Theme.of(context).colorScheme.primary,
            toolbarWidgetColor: Theme.of(context).colorScheme.onPrimary,
            initAspectRatio: CropAspectRatioPreset.original,
            lockAspectRatio: false,
            hideBottomControls: false,
          ),
          IOSUiSettings(
            title: 'Crop Image',
            aspectRatioPresets: [
              CropAspectRatioPreset.original,
              CropAspectRatioPreset.square,
              CropAspectRatioPreset.ratio3x2,
              CropAspectRatioPreset.ratio4x3,
              CropAspectRatioPreset.ratio16x9,
            ],
            aspectRatioLockEnabled: false,
          ),
        ],
      );

      if (croppedFile != null) {
        final Directory appDir = await getApplicationDocumentsDirectory();
        final String savedPath = '${appDir.path}/cropped_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final File savedFile = await File(croppedFile.path).copy(savedPath);

        await _secureStorage.write(key: 'last_cropped_image_path', value: savedPath);

        setState(() => _croppedImage = savedFile);
      }
    } catch (e) {
      setState(() => _error = 'Failed to crop image: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _clearData() async {
    await _secureStorage.deleteAll();
    if (_originalImage != null && await _originalImage!.exists()) {
      await _originalImage!.delete();
    }
    if (_croppedImage != null && await _croppedImage!.exists()) {
      await _croppedImage!.delete();
    }
    setState(() {
      _originalImage = null;
      _croppedImage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Image Cropper')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FilledButton.icon(
              icon: const Icon(Icons.photo_library),
              label: const Text('Pick & Crop Image'),
              onPressed: _isProcessing ? null : _pickAndCropImage,
            ),
            const SizedBox(height: 16),
            if (_isProcessing) const LinearProgressIndicator(),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            if (_originalImage != null) ...[
              const SizedBox(height: 16),
              Text('Original', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              AspectRatio(
                aspectRatio: 1,
                child: Image.file(_originalImage!, fit: BoxFit.cover),
              ),
            ],
            if (_croppedImage != null) ...[
              const SizedBox(height: 16),
              Text('Cropped', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              AspectRatio(
                aspectRatio: 1,
                child: Image.file(_croppedImage!, fit: BoxFit.cover),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: const Icon(Icons.delete_sweep),
                label: const Text('Clear All Data'),
                onPressed: _clearData,
              ),
            ],
          ],
        ),
      ),
    );
  }
}