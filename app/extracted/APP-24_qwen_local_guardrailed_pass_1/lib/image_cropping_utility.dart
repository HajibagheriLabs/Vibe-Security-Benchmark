import 'dart:io';
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'package:image_cropper/image_cropper.dart';

/// A utility class for cropping images securely using native dependencies.
///
/// Rule §1 Compliance:
/// - Does not store tokens or PII.
/// - Returns a `File` (temporary) or `Uint8List` (in-memory).
/// - Rule §3 Compliance:
/// - Uses `image_cropper` which relies on native iOS/Android libraries.
class ImageCroppingUtility {
  /// Crops an image from the given file path using the native cropper.
  ///
  /// [filePath] is the source image.
  /// [aspectRatio] defines the crop constraint.
  /// [maxWidth] and [maxHeight] constrain the output size.
  ///
  /// Returns the path to the cropped file.
  ///
  /// Security Note: The cropper library handles memory management natively,
  /// reducing the risk of buffer overflows common in pure Dart implementations.
  static Future<File?> cropImage({
    required String filePath,
    CropAspectRatio? aspectRatio,
    int maxWidth = 1000,
    int maxHeight = 1000,
  }) async {
    try {
      final CroppedFile? croppedFile = await ImageCropper().cropImage(
        sourcePath: filePath,
        aspectRatio: aspectRatio,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 85,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Image',
            toolbarColor: Colors.deepOrange,
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.original,
            lockAspectRatio: false,
          ),
          IOSUiSettings(
            title: 'Crop Image',
            minimumAspectRatio: 1.0,
          ),
        ],
        maxWidth: maxWidth,
        maxHeight: maxHeight,
      );

      return croppedFile?.path != null ? File(croppedFile.path) : null;
    } catch (e) {
      // In a production app, log this securely (not to console)
      print('Image cropping failed: $e');
      return null;
    }
  }

  /// Converts a `File` to a `Uint8List` (JPEG bytes).
  ///
  /// Useful for uploading to a server or storing in a secure in-memory buffer.
  static Future<Uint8List> fileToBytes(File file) async {
    final bytes = await file.readAsBytes();
    // Decode to ensure it's a valid image structure before returning raw bytes
    final image = img.decodeJpg(bytes);
    if (image == null) {
      throw FormatException('Invalid JPEG image data');
    }
    return Uint8List.fromList(img.encodeJpg(image, quality: 85));
  }

  /// Compresses an image from bytes to reduce size before storage/upload.
  static Uint8List compressImageBytes(Uint8List bytes, {int quality = 85}) {
    final image = img.decodeJpg(bytes);
    if (image == null) {
      throw FormatException('Invalid JPEG image data');
    }
    return Uint8List.fromList(img.encodeJpg(image, quality: quality));
  }
}