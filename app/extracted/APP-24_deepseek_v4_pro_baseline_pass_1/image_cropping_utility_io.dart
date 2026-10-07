// example/main.dart
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_cropping_utility/image_cropping_utility.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Image Cropper Example',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const ImageCropperExample(),
    );
  }
}

class ImageCropperExample extends StatefulWidget {
  const ImageCropperExample({super.key});

  @override
  State<ImageCropperExample> createState() => _ImageCropperExampleState();
}

class _ImageCropperExampleState extends State<ImageCropperExample> {
  final ImageCroppingUtility _croppingUtility = ImageCroppingUtility();
  File? _croppedImage;
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _pickAndCropFromGallery() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final File? result = await _croppingUtility.pickAndCropFromGallery(
        aspectRatioPreset: CropAspectRatioPreset.square,
        cropStyle: CropStyle.rectangle,
      );

      if (mounted) {
        setState(() {
          _croppedImage = result;
        });
      }
    } on ImageCroppingException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _pickAndCropFromCamera() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final File? result = await _croppingUtility.pickAndCropFromCamera(
        aspectRatioPreset: CropAspectRatioPreset.ratio16x9,
        cropStyle: CropStyle.rectangle,
      );

      if (mounted) {
        setState(() {
          _croppedImage = result;
        });
      }
    } on ImageCroppingException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _pickOnlyFromGallery() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final File? result = await _croppingUtility.pickImageFromGallery();

      if (mounted) {
        setState(() {
          _croppedImage = result;
        });
      }
    } on ImageCroppingException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Image Cropper Example'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_croppedImage != null)
                Container(
                  constraints: const BoxConstraints(
                    maxWidth: 300,
                    maxHeight: 300,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      _croppedImage!,
                      fit: BoxFit.contain,
                    ),
                  ),
                )
              else
                Container(
                  width: 300,
                  height: 300,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.grey.shade100,
                  ),
                  child: const Icon(
                    Icons.image_outlined,
                    size: 64,
                    color: Colors.grey,
                  ),
                ),
              const SizedBox(height: 24),
              if (_errorMessage != null) ...[
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
              ],
              if (_isLoading)
                const CircularProgressIndicator()
              else ...[
                ElevatedButton.icon(
                  onPressed: _pickAndCropFromGallery,
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Pick & Crop from Gallery'),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _pickAndCropFromCamera,
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Pick & Crop from Camera'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _pickOnlyFromGallery,
                  icon: const Icon(Icons.image),
                  label: const Text('Pick Only (No Crop)'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}