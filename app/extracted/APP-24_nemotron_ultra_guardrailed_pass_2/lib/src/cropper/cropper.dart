import 'dart:io';
import 'cropper_platform_interface.dart';

class ImageCropper {
  final CropperPlatformInterface _platform;

  ImageCropper({CropperPlatformInterface? platform})
      : _platform = platform ?? _DefaultCropperPlatform();

  Future<File?> cropImage({
    required File sourceFile,
    CropConfig? config,
  }) async {
    if (!await sourceFile.exists()) {
      throw ArgumentError('Source file does not exist: ${sourceFile.path}');
    }
    return _platform.cropImage(sourceFile: sourceFile, config: config ?? const CropConfig());
  }
}

class _DefaultCropperPlatform extends CropperPlatformInterface {
  @override
  Future<File?> cropImage({required File sourceFile, required CropConfig config}) {
    return _invokeNativeCrop(sourceFile, config);
  }
}

---