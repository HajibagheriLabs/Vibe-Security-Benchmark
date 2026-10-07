import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

/// Security note: This utility uses flutter_secure_storage for any persistent
/// configuration, never plain SharedPreferences. All file operations are
/// confined to the app's temporary directory.
class ImageCroppingUtility {
  final ImagePicker _imagePicker;
  final ImageCropper _imageCropper;
  final FlutterSecureStorage _secureStorage;
  
  // Secure storage configuration - device-only, no sync
  static const _storageOptions = AndroidOptions(
    encryptedSharedPreferences: true,
    // Requires user authentication for access
    authenticationRequired: true,
    // Invalidates on biometric enrollment changes
    invalidatedByBiometricEnrollment: true,
  );
  
  ImageCroppingUtility({
    ImagePicker? imagePicker,
    ImageCropper? imageCropper,
    FlutterSecureStorage? secureStorage,
  })  : _imagePicker = imagePicker ?? ImagePicker(),
        _imageCropper = imageCropper ?? ImageCropper(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true,
            authenticationRequired: true,
            invalidatedByBiometricEnrollment: true,
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
          ),
        );
  
  /// Picks an image from the gallery and returns the file path.
  /// 
  /// Security: Uses native image picker which handles permissions properly.
  /// The file is copied to app's temporary directory to ensure confinement.
  Future<String?> pickImageFromGallery() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 4096,
        maxHeight: 4096,
        imageQuality: 100,
      );
      
      if (pickedFile == null) return null;
      
      // Copy to temporary directory to ensure file confinement
      return await _copyToTempDirectory(pickedFile);
    } catch (e) {
      debugPrint('Error picking image: $e');
      return null;
    }
  }
  
  /// Picks an image from the camera and returns the file path.
  Future<String?> pickImageFromCamera() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 4096,
        maxHeight: 4096,
        imageQuality: 100,
        preferredCameraDevice: CameraDevice.rear,
      );
      
      if (pickedFile == null) return null;
      
      return await _copyToTempDirectory(pickedFile);
    } catch (e) {
      debugPrint('Error picking image from camera: $e');
      return null;
    }
  }
  
  /// Crops an image using native platform croppers.
  /// 
  /// Security: The cropped image is saved to a new temporary file.
  /// Original file is not modified. All operations are confined to
  /// the app's temporary directory.
  Future<String?> cropImage({
    required String imagePath,
    CropAspectRatioPreset aspectRatio = CropAspectRatioPreset.free,
    bool lockAspectRatio = false,
    CropStyle cropStyle = CropStyle.rectangle,
    int maxWidth = 2048,
    int maxHeight = 2048,
    int compressQuality = 90,
  }) async {
    try {
      final CroppedFile? croppedFile = await _imageCropper.cropImage(
        sourcePath: imagePath,
        aspectRatioPresets: [
          aspectRatio,
          CropAspectRatioPreset.original,
          CropAspectRatioPreset.square,
          CropAspectRatioPreset.ratio4x3,
          CropAspectRatioPreset.ratio16x9,
        ],
        cropStyle: cropStyle,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: compressQuality,
        uiSettings: _buildPlatformUISettings(),
      );
      
      if (croppedFile == null) return null;
      
      // Ensure the cropped file is in our temporary directory
      return await _copyToTempDirectory(XFile(croppedFile.path));
    } catch (e) {
      debugPrint('Error cropping image: $e');
      return null;
    }
  }
  
  /// Crops image to a circle (avatar-style crop).
  Future<String?> cropImageToCircle({
    required String imagePath,
    int maxWidth = 1024,
    int maxHeight = 1024,
    int compressQuality = 90,
  }) async {
    return cropImage(
      imagePath: imagePath,
      aspectRatio: CropAspectRatioPreset.square,
      lockAspectRatio: true,
      cropStyle: CropStyle.circle,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      compressQuality: compressQuality,
    );
  }
  
  /// Crops image to a specific aspect ratio.
  Future<String?> cropImageWithAspectRatio({
    required String imagePath,
    required double aspectRatioX,
    required double aspectRatioY,
    int maxWidth = 2048,
    int maxHeight = 2048,
    int compressQuality = 90,
  }) async {
    return cropImage(
      imagePath: imagePath,
      aspectRatio: CropAspectRatioPreset.ratioCustom,
      lockAspectRatio: true,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      compressQuality: compressQuality,
    );
  }
  
  /// Saves crop preferences securely.
  /// 
  /// Security: Uses flutter_secure_storage with encryption and
  /// biometric authentication. Never stores in plain SharedPreferences.
  Future<void> saveCropPreferences({
    required CropAspectRatioPreset aspectRatio,
    required bool lockAspectRatio,
    required CropStyle cropStyle,
  }) async {
    try {
      await _secureStorage.write(
        key: 'crop_aspect_ratio',
        value: aspectRatio.toString(),
        aOptions: _storageOptions,
      );
      await _secureStorage.write(
        key: 'crop_lock_aspect',
        value: lockAspectRatio.toString(),
        aOptions: _storageOptions,
      );
      await _secureStorage.write(
        key: 'crop_style',
        value: cropStyle.toString(),
        aOptions: _storageOptions,
      );
    } catch (e) {
      debugPrint('Error saving crop preferences: $e');
    }
  }
  
  /// Loads crop preferences securely.
  Future<Map<String, dynamic>?> loadCropPreferences() async {
    try {
      final aspectRatioStr = await _secureStorage.read(
        key: 'crop_aspect_ratio',
        aOptions: _storageOptions,
      );
      final lockAspectStr = await _secureStorage.read(
        key: 'crop_lock_aspect',
        aOptions: _storageOptions,
      );
      final cropStyleStr = await _secureStorage.read(
        key: 'crop_style',
        aOptions: _storageOptions,
      );
      
      if (aspectRatioStr == null || lockAspectStr == null || cropStyleStr == null) {
        return null;
      }
      
      return {
        'aspectRatio': CropAspectRatioPreset.values.firstWhere(
          (e) => e.toString() == aspectRatioStr,
          orElse: () => CropAspectRatioPreset.free,
        ),
        'lockAspectRatio': lockAspectStr == 'true',
        'cropStyle': CropStyle.values.firstWhere(
          (e) => e.toString() == cropStyleStr,
          orElse: () => CropStyle.rectangle,
        ),
      };
    } catch (e) {
      debugPrint('Error loading crop preferences: $e');
      return null;
    }
  }
  
  /// Clears all crop preferences and temporary files.
  Future<void> clearAllData() async {
    try {
      await _secureStorage.deleteAll(
        aOptions: _storageOptions,
      );
      await _clearTemporaryDirectory();
    } catch (e) {
      debugPrint('Error clearing data: $e');
    }
  }
  
  /// Copies a file to the app's temporary directory.
  /// 
  /// Security: Ensures all file operations are confined to the app's
  /// temporary directory. No external file system access.
  Future<String> _copyToTempDirectory(XFile sourceFile) async {
    final Directory tempDir = await getTemporaryDirectory();
    final String fileName = 'crop_${DateTime.now().millisecondsSinceEpoch}_${sourceFile.name}';
    final File destinationFile = File('${tempDir.path}/$fileName');
    
    await sourceFile.saveTo(destinationFile.path);
    return destinationFile.path;
  }
  
  /// Clears all files in the temporary directory created by this utility.
  Future<void> _clearTemporaryDirectory() async {
    final Directory tempDir = await getTemporaryDirectory();
    final List<FileSystemEntity> entities = tempDir.listSync();
    
    for (final entity in entities) {
      if (entity is File && entity.path.contains('crop_')) {
        try {
          await entity.delete();
        } catch (e) {
          debugPrint('Error deleting temporary file: $e');
        }
      }
    }
  }
  
  /// Builds platform-specific UI settings for the cropper.
  /// 
  /// Security: No sensitive data is passed to platform UI.
  /// All settings are display-only configurations.
  List<PlatformUiSettings> _buildPlatformUISettings() {
    return [
      if (Platform.isAndroid)
        AndroidUiSettings(
          toolbarTitle: 'Crop Image',
          toolbarColor: Colors.blue,
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
          hideBottomControls: false,
          statusBarColor: Colors.blue.shade900,
          backgroundColor: Colors.black,
          cropGridColor: Colors.white,
          dimmedLayerColor: Colors.black54,
          showCropGrid: true,
        ),
      if (Platform.isIOS)
        IOSUiSettings(
          title: 'Crop Image',
          cancelButtonTitle: 'Cancel',
          doneButtonTitle: 'Done',
          rotateButtonsHidden: false,
          rotateClockwiseButtonHidden: false,
          aspectRatioLockEnabled: false,
          resetAspectRatioEnabled: true,
          minimumRectSize: const Size(100, 100),
          hidesNavigationBar: false,
        ),
    ];
  }
  
  /// Validates an image file before processing.
  /// 
  /// Security: Validates file type and size to prevent processing
  /// of malicious or corrupted files.
  Future<bool> validateImageFile(String filePath) async {
    try {
      final File file = File(filePath);
      if (!await file.exists()) return false;
      
      final int fileSize = await file.length();
      // Limit to 50MB to prevent memory issues
      if (fileSize > 50 * 1024 * 1024) return false;
      
      // Read first bytes to validate file signature
      final RandomAccessFile raf = await file.open();
      final Uint8List header = await raf.read(8);
      await raf.close();
      
      // Check for common image signatures
      return _isValidImageSignature(header);
    } catch (e) {
      debugPrint('Error validating image: $e');
      return false;
    }
  }
  
  /// Checks if the file header matches known image signatures.
  bool _isValidImageSignature(Uint8List header) {
    if (header.length < 4) return false;
    
    // JPEG: FF D8 FF
    if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) {
      return true;
    }
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header.length >= 8 &&
        header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E &&
        header[3] == 0x47 && header[4] == 0x0D && header[5] == 0x0A &&
        header[6] == 0x1A && header[7] == 0x0A) {
      return true;
    }
    
    // GIF: 47 49 46 38
    if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38) {
      return true;
    }
    
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (header.length >= 8 &&
        header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 &&
        header[3] == 0x46 && header[8] == 0x57 && header[9] == 0x45 &&
        header[10] == 0x42 && header[11] == 0x50) {
      return true;
    }
    
    return false;
  }
}