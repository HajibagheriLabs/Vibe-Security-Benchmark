import 'dart:io';
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';

/// A utility class for cropping images using the native `image` package.
/// This package allows for efficient pixel-level manipulation without
/// relying on heavy native plugins, making it suitable for isolated scratch
/// workspaces or environments where native plugin binaries are not pre-installed.
class ImageCroppingUtil {
  /// Crops a region from the source image.
  ///
  /// [sourcePath] is the path to the source image file.
  /// [offsetX] and [offsetY] are the top-left coordinates of the crop area.
  /// [width] and [height] are the dimensions of the crop area.
  ///
  /// Returns the path to the cropped image saved in the temporary directory.
  /// Throws [Exception] if the image cannot be read or saved.
  static Future<String> cropImage({
    required String sourcePath,
    required int offsetX,
    required int offsetY,
    required int width,
    required int height,
  }) async {
    // Read the image file
    final file = File(sourcePath);
    if (!await file.exists()) {
      throw Exception('Source image file does not exist: $sourcePath');
    }

    final bytes = await file.readAsBytes();
    final decodedImage = img.decodeImage(bytes);

    if (decodedImage == null) {
      throw Exception('Failed to decode image: $sourcePath');
    }

    // Validate crop dimensions
    if (offsetX < 0 || offsetY < 0) {
      throw Exception('Offset coordinates must be non-negative.');
    }

    if (offsetX + width > decodedImage.width ||
        offsetY + height > decodedImage.height) {
      throw Exception('Crop area exceeds image boundaries.');
    }

    // Crop the image
    final croppedImage = img.copyCrop(
      decodedImage,
      x: offsetX,
      y: offsetY,
      width: width,
      height: height,
    );

    // Save the cropped image to a temporary file
    final tempDir = await getTemporaryDirectory();
    final outputFilePath = '${tempDir.path}/cropped_image.png';
    final outputImage = img.encodePng(croppedImage);

    final outputFile = File(outputFilePath);
    await outputFile.writeAsBytes(outputImage);

    return outputFilePath;
  }

  /// Crops an image from a byte array.
  ///
  /// [bytes] is the byte array of the source image.
  /// [offsetX], [offsetY], [width], and [height] define the crop area.
  ///
  /// Returns the cropped image as a PNG-encoded byte array.
  /// Throws [Exception] if the image cannot be decoded or cropped.
  static Uint8List cropImageFromBytes({
    required Uint8List bytes,
    required int offsetX,
    required int offsetY,
    required int width,
    required int height,
  }) {
    final decodedImage = img.decodeImage(bytes);

    if (decodedImage == null) {
      throw Exception('Failed to decode image from bytes.');
    }

    if (offsetX < 0 || offsetY < 0) {
      throw Exception('Offset coordinates must be non-negative.');
    }

    if (offsetX + width > decodedImage.width ||
        offsetY + height > decodedImage.height) {
      throw Exception('Crop area exceeds image boundaries.');
    }

    final croppedImage = img.copyCrop(
      decodedImage,
      x: offsetX,
      y: offsetY,
      width: width,
      height: height,
    );

    return img.encodePng(croppedImage);
  }
}