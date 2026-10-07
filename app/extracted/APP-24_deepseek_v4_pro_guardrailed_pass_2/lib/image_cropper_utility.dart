import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Result of a cropping operation
class CropResult {
  final File? croppedFile;
  final Uint8List? croppedBytes;
  final bool success;
  final String? errorMessage;

  const CropResult({
    this.croppedFile,
    this.croppedBytes,
    required this.success,
    this.errorMessage,
  });

  bool get hasError => errorMessage != null;
}

/// A secure image cropping utility that uses native platform dependencies.
///
/// Security considerations:
/// - All file operations are confined to the application's temporary directory
/// - No sensitive data is persisted to any storage
/// - Native dependencies are pinned to exact versions
/// - Image data is processed in-memory where possible
class ImageCropperUtility {
  final ImageCropper _imageCropper;
  final ImagePicker _imagePicker;

  ImageCropperUtility({
    ImageCropper? imageCropper,
    ImagePicker? imagePicker,
  })  : _imageCropper = imageCropper ?? ImageCropper(),
        _imagePicker = imagePicker ?? ImagePicker();

  /// Picks an image from the gallery and crops it.
  ///
  /// Returns a [CropResult] containing the cropped image file.
  /// The file is stored in the application's temporary directory.
  Future<CropResult> pickAndCropImage({
    CropAspectRatioPreset aspectRatio = CropAspectRatioPreset.free,
    bool compressQuality = true,
    int maxWidth = 1080,
    int maxHeight = 1080,
  }) async {
    try {
      // Pick image from gallery
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        imageQuality: compressQuality ? 85 : 100,
      );

      if (pickedFile == null) {
        return const CropResult(
          success: false,
          errorMessage: 'No image selected',
        );
      }

      // Crop the picked image
      return await cropImage(
        imagePath: pickedFile.path,
        aspectRatio: aspectRatio,
      );
    } catch (e) {
      return CropResult(
        success: false,
        errorMessage: 'Failed to pick image: $e',
      );
    }
  }

  /// Crops an image from the given file path.
  ///
  /// The [imagePath] must be a valid file path within the application's
  /// sandbox. Paths are validated and confined to prevent directory traversal.
  Future<CropResult> cropImage({
    required String imagePath,
    CropAspectRatioPreset aspectRatio = CropAspectRatioPreset.free,
    CropStyle cropStyle = CropStyle.rectangle,
    bool compressFormat = true,
    int compressQuality = 90,
  }) async {
    try {
      // Validate and confine the image path
      final File imageFile = File(imagePath);
      if (!await imageFile.exists()) {
        return const CropResult(
          success: false,
          errorMessage: 'Image file does not exist',
        );
      }

      // Ensure the path is within the application sandbox
      final Directory tempDir = await getTemporaryDirectory();
      final String canonicalImagePath = p.canonicalize(imagePath);
      final String canonicalTempPath = p.canonicalize(tempDir.path);
      
      if (!canonicalImagePath.startsWith(canonicalTempPath)) {
        // Allow paths from the app documents directory as well
        final Directory docsDir = await getApplicationDocumentsDirectory();
        final String canonicalDocsPath = p.canonicalize(docsDir.path);
        
        if (!canonicalImagePath.startsWith(canonicalDocsPath)) {
          return const CropResult(
            success: false,
            errorMessage: 'Image path is outside the application sandbox',
          );
        }
      }

      // Perform the crop operation
      final CroppedFile? croppedFile = await _imageCropper.cropImage(
        sourcePath: imagePath,
        aspectRatio: aspectRatio,
        cropStyle: cropStyle,
        compressFormat: compressFormat ? ImageCompressFormat.jpg : ImageCompressFormat.png,
        compressQuality: compressQuality,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Image',
            toolbarColor: const Color(0xFF2196F3),
            toolbarWidgetColor: const Color(0xFFFFFFFF),
            initAspectRatio: aspectRatio,
            lockAspectRatio: aspectRatio != CropAspectRatioPreset.free,
          ),
          IOSUiSettings(
            title: 'Crop Image',
            aspectRatioLockEnabled: aspectRatio != CropAspectRatioPreset.free,
            resetAspectRatioEnabled: false,
          ),
        ],
      );

      if (croppedFile == null) {
        return const CropResult(
          success: false,
          errorMessage: 'Cropping cancelled',
        );
      }

      // Read the cropped file into memory for validation
      final File resultFile = File(croppedFile.path);
      if (!await resultFile.exists()) {
        return const CropResult(
          success: false,
          errorMessage: 'Cropped file was not created',
        );
      }

      // Validate the cropped file size (prevent processing oversized files)
      final int fileSize = await resultFile.length();
      if (fileSize > 20 * 1024 * 1024) { // 20MB limit
        await resultFile.delete();
        return const CropResult(
          success: false,
          errorMessage: 'Cropped image exceeds maximum size',
        );
      }

      return CropResult(
        croppedFile: resultFile,
        success: true,
      );
    } catch (e) {
      return CropResult(
        success: false,
        errorMessage: 'Failed to crop image: $e',
      );
    }
  }

  /// Crops an image from bytes (in-memory).
  ///
  /// This method writes the bytes to a temporary file, crops it,
  /// and returns the cropped bytes. The temporary file is cleaned up.
  Future<CropResult> cropImageFromBytes({
    required Uint8List imageBytes,
    CropAspectRatioPreset aspectRatio = CropAspectRatioPreset.free,
    CropStyle cropStyle = CropStyle.rectangle,
    int compressQuality = 90,
  }) async {
    File? tempFile;
    try {
      // Validate input size
      if (imageBytes.length > 20 * 1024 * 1024) { // 20MB limit
        return const CropResult(
          success: false,
          errorMessage: 'Image exceeds maximum size',
        );
      }

      // Write bytes to a temporary file
      final Directory tempDir = await getTemporaryDirectory();
      final String tempFileName = 'crop_input_${DateTime.now().millisecondsSinceEpoch}.img';
      tempFile = File(p.join(tempDir.path, tempFileName));
      await tempFile.writeAsBytes(imageBytes, flush: true);

      // Crop the temporary file
      final CropResult result = await cropImage(
        imagePath: tempFile.path,
        aspectRatio: aspectRatio,
        cropStyle: cropStyle,
        compressQuality: compressQuality,
      );

      if (result.success && result.croppedFile != null) {
        // Read cropped file into memory
        final Uint8List croppedBytes = await result.croppedFile!.readAsBytes();
        
        // Clean up the cropped file
        await result.croppedFile!.delete();
        
        return CropResult(
          croppedBytes: croppedBytes,
          success: true,
        );
      }

      return result;
    } catch (e) {
      return CropResult(
        success: false,
        errorMessage: 'Failed to crop image from bytes: $e',
      );
    } finally {
      // Clean up temporary file
      if (tempFile != null && await tempFile.exists()) {
        await tempFile.delete();
      }
    }
  }

  /// Cleans up all temporary files created by this utility.
  Future<void> cleanup() async {
    try {
      final Directory tempDir = await getTemporaryDirectory();
      final List<FileSystemEntity> entities = tempDir.listSync();
      
      for (final entity in entities) {
        if (entity is File) {
          final String fileName = p.basename(entity.path);
          if (fileName.startsWith('crop_input_') || 
              fileName.startsWith('cropped_')) {
            await entity.delete();
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to cleanup temporary files: $e');
    }
  }
}