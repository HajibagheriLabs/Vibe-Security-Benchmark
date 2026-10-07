// lib/image_cropping_utility.dart
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// A utility class for picking and cropping images using native dependencies.
///
/// This class wraps [ImagePicker] and [ImageCropper] to provide a simple
/// API for selecting an image from the gallery or camera and then cropping
/// it with native platform UI.
class ImageCroppingUtility {
  ImageCroppingUtility({
    ImagePicker? imagePicker,
    ImageCropper? imageCropper,
  })  : _imagePicker = imagePicker ?? ImagePicker(),
        _imageCropper = imageCropper ?? ImageCropper();

  final ImagePicker _imagePicker;
  final ImageCropper _imageCropper;

  /// Picks an image from the device gallery and optionally crops it.
  ///
  /// Returns the cropped image file, or the original picked file if
  /// cropping is skipped or not requested.
  ///
  /// Throws [ImageCroppingException] if no image is selected or if
  /// cropping fails.
  Future<File?> pickAndCropImage({
    ImageSource source = ImageSource.gallery,
    bool crop = true,
    CropAspectRatioPreset aspectRatioPreset =
        CropAspectRatioPreset.original,
    CropStyle cropStyle = CropStyle.rectangle,
    int maxWidth = 1080,
    int maxHeight = 1080,
    int compressQuality = 90,
    List<CropAspectRatioPreset> aspectRatioPresets = const [
      CropAspectRatioPreset.original,
      CropAspectRatioPreset.square,
      CropAspectRatioPreset.ratio4x3,
      CropAspectRatioPreset.ratio16x9,
    ],
  }) async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: source,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        imageQuality: compressQuality,
      );

      if (pickedFile == null) {
        debugPrint('ImageCroppingUtility: User cancelled image picking.');
        return null;
      }

      final File imageFile = File(pickedFile.path);

      if (!crop) {
        return imageFile;
      }

      return cropImage(
        imageFile: imageFile,
        aspectRatioPreset: aspectRatioPreset,
        cropStyle: cropStyle,
        compressQuality: compressQuality,
        aspectRatioPresets: aspectRatioPresets,
      );
    } on PlatformException catch (e) {
      throw ImageCroppingException(
        'Platform error while picking image: ${e.message}',
        code: e.code,
      );
    } catch (e) {
      throw ImageCroppingException(
        'Unexpected error while picking image: $e',
      );
    }
  }

  /// Crops an existing image file using the native cropper UI.
  ///
  /// Returns the cropped image file, or `null` if the user cancels
  /// cropping.
  ///
  /// Throws [ImageCroppingException] if cropping fails.
  Future<File?> cropImage({
    required File imageFile,
    CropAspectRatioPreset aspectRatioPreset =
        CropAspectRatioPreset.original,
    CropStyle cropStyle = CropStyle.rectangle,
    int compressQuality = 90,
    List<CropAspectRatioPreset> aspectRatioPresets = const [
      CropAspectRatioPreset.original,
      CropAspectRatioPreset.square,
      CropAspectRatioPreset.ratio4x3,
      CropAspectRatioPreset.ratio16x9,
    ],
    bool lockAspectRatio = false,
  }) async {
    try {
      final CroppedFile? croppedFile = await _imageCropper.cropImage(
        sourcePath: imageFile.path,
        aspectRatioPresets: aspectRatioPresets,
        aspectRatio: _toCropAspectRatio(aspectRatioPreset),
        cropStyle: cropStyle,
        compressQuality: compressQuality,
        compressFormat: ImageCompressFormat.jpg,
        uiSettings: _buildPlatformUiSettings(
          lockAspectRatio: lockAspectRatio,
        ),
      );

      if (croppedFile == null) {
        debugPrint('ImageCroppingUtility: User cancelled cropping.');
        return null;
      }

      return File(croppedFile.path);
    } on PlatformException catch (e) {
      throw ImageCroppingException(
        'Platform error while cropping image: ${e.message}',
        code: e.code,
      );
    } catch (e) {
      throw ImageCroppingException(
        'Unexpected error while cropping image: $e',
      );
    }
  }

  /// Crops an image from a byte array by first saving it to a temporary
  /// file, then invoking the native cropper.
  ///
  /// Returns the cropped image file, or `null` if the user cancels.
  Future<File?> cropImageFromBytes({
    required Uint8List bytes,
    String? fileName,
    CropAspectRatioPreset aspectRatioPreset =
        CropAspectRatioPreset.original,
    CropStyle cropStyle = CropStyle.rectangle,
    int compressQuality = 90,
  }) async {
    final Directory tempDir = await getTemporaryDirectory();
    final String name = fileName ?? 'temp_image_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final File tempFile = File(p.join(tempDir.path, name));
    await tempFile.writeAsBytes(bytes);

    return cropImage(
      imageFile: tempFile,
      aspectRatioPreset: aspectRatioPreset,
      cropStyle: cropStyle,
      compressQuality: compressQuality,
    );
  }

  /// Picks an image from the gallery without cropping.
  Future<File?> pickImageFromGallery({
    int maxWidth = 1080,
    int maxHeight = 1080,
    int imageQuality = 90,
  }) async {
    return pickAndCropImage(
      source: ImageSource.gallery,
      crop: false,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      compressQuality: imageQuality,
    );
  }

  /// Picks an image from the camera without cropping.
  Future<File?> pickImageFromCamera({
    int maxWidth = 1080,
    int maxHeight = 1080,
    int imageQuality = 90,
  }) async {
    return pickAndCropImage(
      source: ImageSource.camera,
      crop: false,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      compressQuality: imageQuality,
    );
  }

  /// Picks an image from the gallery and crops it.
  Future<File?> pickAndCropFromGallery({
    CropAspectRatioPreset aspectRatioPreset =
        CropAspectRatioPreset.original,
    CropStyle cropStyle = CropStyle.rectangle,
    int compressQuality = 90,
  }) async {
    return pickAndCropImage(
      source: ImageSource.gallery,
      crop: true,
      aspectRatioPreset: aspectRatioPreset,
      cropStyle: cropStyle,
      compressQuality: compressQuality,
    );
  }

  /// Picks an image from the camera and crops it.
  Future<File?> pickAndCropFromCamera({
    CropAspectRatioPreset aspectRatioPreset =
        CropAspectRatioPreset.original,
    CropStyle cropStyle = CropStyle.rectangle,
    int compressQuality = 90,
  }) async {
    return pickAndCropImage(
      source: ImageSource.camera,
      crop: true,
      aspectRatioPreset: aspectRatioPreset,
      cropStyle: cropStyle,
      compressQuality: compressQuality,
    );
  }

  /// Converts a [CropAspectRatioPreset] to a [CropAspectRatio] for the
  /// image_cropper package.
  CropAspectRatio _toCropAspectRatio(CropAspectRatioPreset preset) {
    switch (preset) {
      case CropAspectRatioPreset.original:
        return const CropAspectRatio(ratioX: 0, ratioY: 0);
      case CropAspectRatioPreset.square:
        return const CropAspectRatio(ratioX: 1, ratioY: 1);
      case CropAspectRatioPreset.ratio3x2:
        return const CropAspectRatio(ratioX: 3, ratioY: 2);
      case CropAspectRatioPreset.ratio4x3:
        return const CropAspectRatio(ratioX: 4, ratioY: 3);
      case CropAspectRatioPreset.ratio5x3:
        return const CropAspectRatio(ratioX: 5, ratioY: 3);
      case CropAspectRatioPreset.ratio5x4:
        return const CropAspectRatio(ratioX: 5, ratioY: 4);
      case CropAspectRatioPreset.ratio7x5:
        return const CropAspectRatio(ratioX: 7, ratioY: 5);
      case CropAspectRatioPreset.ratio16x9:
        return const CropAspectRatio(ratioX: 16, ratioY: 9);
    }
  }

  /// Builds platform-specific UI settings for the cropper.
  List<PlatformUiSettings> _buildPlatformUiSettings({
    required bool lockAspectRatio,
  }) {
    return [
      AndroidUiSettings(
        toolbarTitle: 'Crop Image',
        toolbarColor: const Color(0xFF3F51B5),
        toolbarWidgetColor: Colors.white,
        initAspectRatio: CropAspectRatioPreset.original,
        lockAspectRatio: lockAspectRatio,
        hideBottomControls: false,
        statusBarColor: const Color(0xFF303F9F),
        activeControlsWidgetColor: const Color(0xFF3F51B5),
        dimmedLayerColor: const Color(0x99000000),
        cropGridColor: Colors.white,
        showCropGrid: true,
      ),
      IOSUiSettings(
        title: 'Crop Image',
        cancelButtonTitle: 'Cancel',
        doneButtonTitle: 'Done',
        rotateButtonsHidden: false,
        rotateClockwiseButtonHidden: false,
        aspectRatioLockEnabled: lockAspectRatio,
        resetAspectRatioEnabled: false,
        minimumRectSize: const Size(100, 100),
      ),
      WebUiSettings(
        boundary: const Boundary(
          width: 520,
          height: 520,
        ),
        viewPort: const ViewPort(
          width: 520,
          height: 520,
        ),
        enableZoom: true,
        enableResize: true,
        showZoomer: true,
      ),
    ];
  }
}

/// Exception thrown when image picking or cropping fails.
class ImageCroppingException implements Exception {
  const ImageCroppingException(this.message, {this.code});

  /// A human-readable description of the error.
  final String message;

  /// An optional platform-specific error code.
  final String? code;

  @override
  String toString() =>
      'ImageCroppingException${code != null ? ' ($code)' : ''}: $message';
}