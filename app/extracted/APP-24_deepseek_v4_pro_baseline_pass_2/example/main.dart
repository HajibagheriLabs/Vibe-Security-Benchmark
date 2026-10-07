// example/main.dart
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_cropper_native/image_cropper_native.dart';
import 'package:image_cropper_native/widgets/crop_editor.dart';

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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const CropExamplePage(),
    );
  }
}

class CropExamplePage extends StatefulWidget {
  const CropExamplePage({super.key});

  @override
  State<CropExamplePage> createState() => _CropExamplePageState();
}

class _CropExamplePageState extends State<CropExamplePage> {
  Uint8List? _imageBytes;
  Uint8List? _croppedBytes;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadSampleImage();
  }

  Future<void> _loadSampleImage() async {
    setState(() => _isLoading = true);

    // In a real app, you would load from a file, asset, or network.
    // This creates a simple gradient image for demonstration.
    final bytes = await _createSampleImage();

    if (mounted) {
      setState(() {
        _imageBytes = bytes;
        _isLoading = false;
      });
    }
  }

  Future<Uint8List> _createSampleImage() async {
    // Create a simple 800x600 image with a gradient
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Colors.red, Colors.blue, Colors.green],
      ).createShader(const Rect.fromLTWH(0, 0, 800, 600));
    canvas.drawRect(const Rect.fromLTWH(0, 0, 800, 600), paint);

    final picture = recorder.endRecording();
    final image = await picture.toImage(800, 600);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  Future<void> _handleCropConfirmed(Uint8List croppedBytes) async {
    setState(() {
      _croppedBytes = croppedBytes;
    });

    // Optionally save to file
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/cropped_result.png');
    await file.writeAsBytes(croppedBytes);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Cropped image saved to: ${file.path}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Image Cropper Example'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _croppedBytes != null
              ? _buildResultView()
              : _imageBytes != null
                  ? CropEditor(
                      imageBytes: _imageBytes!,
                      aspectRatio: 1.0,
                      onCropConfirmed: _handleCropConfirmed,
                      onCancel: () {
                        setState(() {
                          _croppedBytes = null;
                        });
                      },
                    )
                  : const Center(child: Text('No image loaded')),
    );
  }

  Widget _buildResultView() {
    return Column(
      children: [
        Expanded(
          child: Center(
            child: Image.memory(_croppedBytes!),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _croppedBytes = null;
                  });
                },
                child: const Text('Crop Again'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}