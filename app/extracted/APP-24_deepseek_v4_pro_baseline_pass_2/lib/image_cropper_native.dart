// lib/image_cropper_native.dart
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';

/// A utility class for cropping images using native dependencies.
///
/// This class provides methods to crop images from various sources
/// (file, bytes, asset) using the native image processing capabilities
/// available through the `image` package, which leverages platform-specific
/// optimizations where available.
class ImageCropperNative {
  ImageCropperNative._();

  static const MethodChannel _channel = MethodChannel('image_cropper_native');

  /// Crops an image from a file path.
  ///
  /// [sourcePath] - The path to the source image file.
  /// [cropRect] - The rectangle (in pixels) to crop from the image.
  /// [outputPath] - Optional output path. If not provided, a temporary file
  ///   will be created.
  ///
  /// Returns the path to the cropped image file.
  static Future<String> cropImageFromFile({
    required String sourcePath,
    required Rect cropRect,
    String? outputPath,
  }) async {
    final file = File(sourcePath);
    if (!await file.exists()) {
      throw ArgumentError('Source file does not exist: $sourcePath');
    }

    final bytes = await file.readAsBytes();
    final croppedBytes = await cropImageFromBytes(
      bytes: bytes,
      cropRect: cropRect,
    );

    final path = outputPath ?? await _getDefaultOutputPath(sourcePath);
    final outputFile = File(path);
    await outputFile.writeAsBytes(croppedBytes);
    return path;
  }

  /// Crops an image from raw bytes.
  ///
  /// [bytes] - The raw image bytes.
  /// [cropRect] - The rectangle (in pixels) to crop from the image.
  ///
  /// Returns the cropped image bytes.
  static Future<Uint8List> cropImageFromBytes({
    required Uint8List bytes,
    required Rect cropRect,
  }) async {
    return compute(_cropImageInIsolate, _CropRequest(bytes, cropRect));
  }

  /// Crops an image from a Flutter asset.
  ///
  /// [assetPath] - The asset path (e.g., 'assets/images/photo.jpg').
  /// [cropRect] - The rectangle (in pixels) to crop from the image.
  /// [outputPath] - Optional output path.
  ///
  /// Returns the path to the cropped image file.
  static Future<String> cropImageFromAsset({
    required String assetPath,
    required Rect cropRect,
    String? outputPath,
  }) async {
    final byteData = await rootBundle.load(assetPath);
    final bytes = byteData.buffer.asUint8List();

    final croppedBytes = await cropImageFromBytes(
      bytes: bytes,
      cropRect: cropRect,
    );

    final path = outputPath ?? await _getDefaultOutputPath(assetPath);
    final outputFile = File(path);
    await outputFile.writeAsBytes(croppedBytes);
    return path;
  }

  /// Crops an image using the native platform channel (if available).
  ///
  /// This method attempts to use platform-specific native cropping
  /// implementations (e.g., Android's Bitmap crop, iOS's CGImage cropping)
  /// through a method channel. Falls back to Dart-based cropping if the
  /// native implementation is unavailable.
  ///
  /// [sourcePath] - The path to the source image file.
  /// [cropRect] - The rectangle (in pixels) to crop from the image.
  /// [outputPath] - Optional output path.
  ///
  /// Returns the path to the cropped image file.
  static Future<String> cropImageWithNativeChannel({
    required String sourcePath,
    required Rect cropRect,
    String? outputPath,
  }) async {
    try {
      final result = await _channel.invokeMethod<String>('cropImage', {
        'sourcePath': sourcePath,
        'left': cropRect.left,
        'top': cropRect.top,
        'width': cropRect.width,
        'height': cropRect.height,
        'outputPath': outputPath,
      });

      if (result != null) {
        return result;
      }
    } on PlatformException catch (e) {
      debugPrint('Native crop failed, falling back to Dart: ${e.message}');
    } on MissingPluginException {
      debugPrint('Native crop plugin not available, falling back to Dart.');
    }

    // Fallback to Dart-based cropping
    return cropImageFromFile(
      sourcePath: sourcePath,
      cropRect: cropRect,
      outputPath: outputPath,
    );
  }

  /// Validates that a crop rectangle is within image bounds.
  ///
  /// [imageWidth] - The width of the source image.
  /// [imageHeight] - The height of the source image.
  /// [cropRect] - The rectangle to validate.
  ///
  /// Returns a clamped rectangle that fits within the image bounds.
  static Rect validateCropRect({
    required int imageWidth,
    required int imageHeight,
    required Rect cropRect,
  }) {
    final left = cropRect.left.clamp(0.0, imageWidth.toDouble());
    final top = cropRect.top.clamp(0.0, imageHeight.toDouble());
    final right = cropRect.right.clamp(0.0, imageWidth.toDouble());
    final bottom = cropRect.bottom.clamp(0.0, imageHeight.toDouble());

    return Rect.fromLTRB(left, top, right, bottom);
  }

  static Future<String> _getDefaultOutputPath(String sourcePath) async {
    final dir = await getTemporaryDirectory();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final extension = sourcePath.split('.').last;
    return '${dir.path}/cropped_$timestamp.$extension';
  }

  static Uint8List _cropImageInIsolate(_CropRequest request) {
    final decoded = img.decodeImage(request.bytes);
    if (decoded == null) {
      throw ArgumentError('Unable to decode image bytes.');
    }

    final validatedRect = validateCropRect(
      imageWidth: decoded.width,
      imageHeight: decoded.height,
      cropRect: request.cropRect,
    );

    final cropped = img.copyCrop(
      decoded,
      x: validatedRect.left.toInt(),
      y: validatedRect.top.toInt(),
      width: validatedRect.width.toInt(),
      height: validatedRect.height.toInt(),
    );

    final encoded = img.encodeJpg(cropped, quality: 95);
    return Uint8List.fromList(encoded);
  }
}

/// A simple rectangle class for crop operations.
class Rect {
  final double left;
  final double top;
  final double right;
  final double bottom;

  const Rect.fromLTRB(this.left, this.top, this.right, this.bottom);

  double get width => right - left;
  double get height => bottom - top;

  @override
  String toString() =>
      'Rect.fromLTRB($left, $top, $right, $bottom)';
}

class _CropRequest {
  final Uint8List bytes;
  final Rect cropRect;

  _CropRequest(this.bytes, this.cropRect);
}