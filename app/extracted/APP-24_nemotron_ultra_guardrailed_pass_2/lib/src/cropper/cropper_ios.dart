import 'dart:io';
import 'package:flutter/services.dart';
import 'cropper_platform_interface.dart';

class IOSCropper extends CropperPlatformInterface {
  static const MethodChannel _channel = MethodChannel('com.example.image_cropper/ios');

  @override
  Future<File?> cropImage({required File sourceFile, required CropConfig config}) async {
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

---