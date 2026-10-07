import 'dart:io';
import 'package:flutter/services.dart';

abstract class CropperPlatformInterface {
  Future<File?> cropImage({
    required File sourceFile,
    required CropConfig config,
  });

  static const MethodChannel _channel = MethodChannel('com.example.image_cropper/native');

  static Future<File?> _invokeNativeCrop(File sourceFile, CropConfig config) async {
    final result = await _channel.invokeMethod<String>('cropImage', {
      'sourcePath': sourceFile.path,
      'aspectRatio': config.aspectRatio,
      'maxWidth': config.maxWidth,
      'maxHeight': config.maxHeight,
      'compressFormat': config.compressFormat.name,
      'compressQuality': config.compressQuality,
    });
    return result != null ? File(result) : null;
  }
}

class CropConfig {
  final double? aspectRatio;
  final int? maxWidth;
  final int? maxHeight;
  final CompressFormat compressFormat;
  final int compressQuality;

  const CropConfig({
    this.aspectRatio,
    this.maxWidth,
    this.maxHeight,
    this.compressFormat = CompressFormat.jpeg,
    this.compressQuality = 90,
  });
}

enum CompressFormat { jpeg, png, webp }

---