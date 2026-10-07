import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

export 'src/crop_options.dart';
export 'src/cropped_file.dart';

class ImageCropperUtility {
  static final ImageCropperUtility _instance = ImageCropperUtility._internal();
  factory ImageCropperUtility() => _instance;
  ImageCropperUtility._internal();

  Future<CroppedFile?> cropImage({
    required String sourcePath,
    CropOptions? options,
  }) async {
    return ImageCropperUtilityPlatform.instance.cropImage(
      sourcePath: sourcePath,
      options: options,
    );
  }
}

abstract class ImageCropperUtilityPlatform extends PlatformInterface {
  ImageCropperUtilityPlatform() : super(token: _token);

  static final Object _token = Object();

  static ImageCropperUtilityPlatform _instance = MethodChannelImageCropperUtility();

  static ImageCropperUtilityPlatform get instance => _instance;

  static set instance(ImageCropperUtilityPlatform instance) {
    PlatformInterface.verifyToken(instance, _token);
    _instance = instance;
  }

  Future<CroppedFile?> cropImage({
    required String sourcePath,
    CropOptions? options,
  }) {
    throw UnimplementedError('cropImage() has not been implemented.');
  }
}

class MethodChannelImageCropperUtility extends ImageCropperUtilityPlatform {
  static const MethodChannel _channel = MethodChannel('image_cropper_utility');

  @override
  Future<CroppedFile?> cropImage({
    required String sourcePath,
    CropOptions? options,
  }) async {
    final Map<String, dynamic> arguments = {
      'sourcePath': sourcePath,
      'options': options?.toMap() ?? {},
    };

    final Map<dynamic, dynamic>? result = await _channel.invokeMapMethod<
        dynamic, dynamic>('cropImage', arguments);

    if (result == null) return null;

    return CroppedFile.fromMap(result.cast<String, dynamic>());
  }
}