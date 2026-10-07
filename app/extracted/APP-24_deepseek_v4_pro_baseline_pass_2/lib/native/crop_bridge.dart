// lib/native/crop_bridge.dart
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';

import 'package:ffi/ffi.dart';

/// Native FFI bindings for platform-specific image cropping.
///
/// This class provides direct FFI bindings to native image processing
/// libraries (e.g., libjpeg, libpng) for high-performance cropping
/// operations. The actual native library must be provided by the
/// platform-specific build configuration.
class NativeCropBridge {
  NativeCropBridge._();

  static final NativeCropBridge _instance = NativeCropBridge._();

  static NativeCropBridge get instance => _instance;

  DynamicLibrary? _library;
  bool _initialized = false;

  // Native function signatures
  late final _CropImageNative _cropImageNative;

  /// Initializes the native library bindings.
  ///
  /// [libraryPath] - Optional path to the native library. If not provided,
  ///   the default platform library name will be used.
  void initialize({String? libraryPath}) {
    if (_initialized) return;

    final path = libraryPath ?? _getDefaultLibraryPath();
    _library = DynamicLibrary.open(path);

    _cropImageNative = _library!.lookupFunction<
        IntPtr Function(
            Pointer<Uint8>, Int32, Int32, Int32, Int32, Int32, Pointer<Int32>),
        int Function(Pointer<Uint8>, int, int, int, int, int,
            Pointer<Int32>)>('crop_image_native');

    _initialized = true;
  }

  /// Crops an image using the native library.
  ///
  /// [imageBytes] - The raw image bytes.
  /// [x] - The x-coordinate of the crop rectangle.
  /// [y] - The y-coordinate of the crop rectangle.
  /// [width] - The width of the crop rectangle.
  /// [height] - The height of the crop rectangle.
  ///
  /// Returns the cropped image bytes.
  Uint8List cropImage({
    required Uint8List imageBytes,
    required int x,
    required int y,
    required int width,
    required int height,
  }) {
    if (!_initialized) {
      initialize();
    }

    final inputPtr = malloc<Uint8>(imageBytes.length);
    final outputSizePtr = malloc<Int32>();

    try {
      // Copy input bytes to native memory
      for (var i = 0; i < imageBytes.length; i++) {
        inputPtr[i] = imageBytes[i];
      }

      final resultPtr = _cropImageNative(
        inputPtr,
        imageBytes.length,
        x,
        y,
        width,
        height,
        outputSizePtr,
      );

      if (resultPtr == nullptr) {
        throw StateError('Native crop operation failed.');
      }

      final outputSize = outputSizePtr.value;
      final resultBytes = resultPtr.asTypedList(outputSize);

      // Copy result before freeing native memory
      final output = Uint8List.fromList(resultBytes);

      // Free native memory
      free(resultPtr);
      return output;
    } finally {
      free(inputPtr);
      free(outputSizePtr);
    }
  }

  /// Releases native resources.
  void dispose() {
    _library = null;
    _initialized = false;
  }

  String _getDefaultLibraryPath() {
    if (Platform.isAndroid) {
      return 'libnative_crop.so';
    } else if (Platform.isIOS || Platform.isMacOS) {
      return 'libnative_crop.dylib';
    } else if (Platform.isWindows) {
      return 'native_crop.dll';
    } else if (Platform.isLinux) {
      return 'libnative_crop.so';
    }
    throw UnsupportedError('Unsupported platform for native cropping.');
  }
}

// Native function typedefs
typedef _CropImageNativeC = IntPtr Function(
    Pointer<Uint8>, Int32, Int32, Int32, Int32, Int32, Pointer<Int32>);
typedef _CropImageNative = int Function(
    Pointer<Uint8>, int, int, int, int, int, Pointer<Int32>);