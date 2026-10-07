import 'dart:io';
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

/// A utility class for cropping images using the `image` package.
/// It supports selecting an image via `image_picker` and cropping it
/// to a specified rectangular region.
class ImageCroppingUtil {
  /// Crops the given [imageFile] to the specified [cropRect].
  ///
  /// [cropRect] defines the region to keep: x, y, width, height.
  /// Returns a [File] pointing to the cropped image saved in the app's
  /// temporary directory.
  ///
  /// Throws [Exception] if the image cannot be loaded or cropped.
  static Future<File> cropImage(
    File imageFile, {
    required int x,
    required int y,
    required int width,
    required int height,
  }) async {
    // Read the image bytes
    final Uint8List bytes = await imageFile.readAsBytes();

    // Decode the image
    img.Image? originalImage = img.decodeImage(bytes);
    if (originalImage == null) {
      throw Exception('Failed to decode image');
    }

    // Validate crop rectangle
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      throw Exception('Invalid crop rectangle dimensions');
    }

    if (x + width > originalImage.width || y + height > originalImage.height) {
      throw Exception('Crop rectangle exceeds image bounds');
    }

    // Crop the image
    final img.Image croppedImage = img.copyCrop(
      originalImage,
      x: x,
      y: y,
      width: width,
      height: height,
    );

    // Encode the cropped image back to PNG bytes
    final Uint8List croppedBytes = img.encodePng(croppedImage);

    // Save to a temporary file
    final Directory tempDir = await getTemporaryDirectory();
    final String fileName = path.basename(imageFile.path);
    final String croppedFileName = path.join(
      tempDir.path,
      'cropped_${path.basenameWithoutExtension(fileName)}.png',
    );

    final File croppedFile = File(croppedFileName);
    await croppedFile.writeAsBytes(croppedBytes);

    return croppedFile;
  }
}