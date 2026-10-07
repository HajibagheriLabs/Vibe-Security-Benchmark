import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Utility class for handling image picking and cropping using native dependencies.
///
/// Security Audit:
/// - [image_cropper]: Uses native iOS (UIImagePickerController) and Android (CropImage) APIs.
///   No third-party JS bridge overhead.
/// - [image_picker]: Picks from gallery/camera.
/// - Secure Store: Stores the cropped image URI path securely if persistence is required.
class ImageCropperUtil {
  final ImagePicker _picker = ImagePicker();
  final ImageCropper _cropper = ImageCropper();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Picks an image from the gallery and crops it.
  ///
  /// Returns a [File] if successful, null otherwise.
  Future<File?> cropImageFromGallery() async {
    try {
      // 1. Pick image
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (pickedFile == null) {
        return null;
      }

      // 2. Crop image using native cropper
      final CroppedFile? croppedFile = await _cropper.cropImage(
        sourcePath: pickedFile.path,
        aspectRatioPresets: [
          CropAspectRatioPreset.square,
          CropAspectRatioPreset.ratio4x3,
        ],
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
      );

      if (croppedFile == null) {
        return null;
      }

      // 3. Return as File
      return File(croppedFile.path);
    } catch (e) {
      // Log error securely (not PII, but context)
      debugPrint('Image cropping failed: $e');
      return null;
    }
  }

  /// Stores the URI of the cropped image in secure storage.
  ///
  /// [imageUri] The path to the cropped image.
  Future<void> saveCroppedImageUri(String imageUri) async {
    await _storage.write(key: 'cropped_image_uri', value: imageUri);
  }

  /// Retrieves the stored image URI.
  Future<String?> getCroppedImageUri() async {
    return await _storage.read(key: 'cropped_image_uri');
  }

  /// Clears the stored image URI.
  Future<void> clearCroppedImageUri() async {
    await _storage.delete(key: 'cropped_image_uri');
  }
}