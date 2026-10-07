import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'src/cropper/cropper.dart';
import 'src/cropper/cropper_platform_interface.dart';

void main() {
  runApp(const ImageCropperApp());
}

class ImageCropperApp extends StatelessWidget {
  const ImageCropperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Image Cropper',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.blue,
      ),
      home: const CropperHomePage(),
    );
  }
}

class CropperHomePage extends StatefulWidget {
  const CropperHomePage({super.key});

  @override
  State<CropperHomePage> createState() => _CropperHomePageState();
}

class _CropperHomePageState extends State<CropperHomePage> {
  final ImageCropper _cropper = ImageCropper();
  final ImagePicker _picker = ImagePicker();
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
      final XFile? pickedFile = await _picker.pickImage(source: ImageSource.gallery);
      if (pickedFile == null) {
        setState(() => _isProcessing = false);
        return;
      }

      final File sourceFile = File(pickedFile.path);
      final Directory tempDir = await getTemporaryDirectory();
      final String tempPath = '${tempDir.path}/source_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final File tempFile = await sourceFile.copy(tempPath);

      setState(() => _originalImage = tempFile);

      final File? cropped = await _cropper.cropImage(
        sourceFile: tempFile,
        config: const CropConfig(
          aspectRatio: 1.0,
          maxWidth: 1024,
          maxHeight: 1024,
          compressFormat: CompressFormat.jpeg,
          compressQuality: 85,
        ),
      );

      setState(() {
        _croppedImage = cropped;
        _isProcessing = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Image Cropper')),
      body: Center(
        child: _isProcessing
            ? const CircularProgressIndicator()
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(_error!, style: const TextStyle(color: Colors.red)),
                    ),
                  if (_originalImage != null) ...[
                    const Text('Original'),
                    Image.file(_originalImage!, height: 200),
                    const SizedBox(height: 16),
                  ],
                  if (_croppedImage != null) ...[
                    const Text('Cropped'),
                    Image.file(_croppedImage!, height: 200),
                    const SizedBox(height: 16),
                  ],
                  ElevatedButton.icon(
                    onPressed: _pickAndCropImage,
                    icon: const Icon(Icons.crop),
                    label: const Text('Pick & Crop Image'),
                  ),
                ],
              ),
      ),
    );
  }
}