// lib/image_cropping_utility_web.dart
// Web-specific stub for platforms where native cropping is unavailable.
// The image_cropper package does not support web cropping with native UI,
// so this provides a fallback that returns the original image.

import 'dart:typed_data';

import 'package:flutter/foundation.dart';

/// Web fallback implementation of the image cropping utility.
///
/// On web, native image cropping is not available. This stub provides
/// the same API surface but returns the original image without cropping.
class ImageCroppingUtilityWeb {
  const ImageCroppingUtilityWeb();

  /// Returns the original image bytes without cropping.
  Future<Uint8List?> cropImageBytes(Uint8List bytes) async {
    debugPrint('ImageCroppingUtilityWeb: Cropping not supported on web.');
    return bytes;
  }
}