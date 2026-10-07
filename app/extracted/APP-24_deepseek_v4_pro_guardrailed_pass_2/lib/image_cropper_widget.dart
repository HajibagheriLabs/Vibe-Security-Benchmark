import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';

import 'image_cropper_utility.dart';

/// A Flutter widget that provides image cropping functionality.
///
/// This widget wraps the [ImageCropperUtility] and provides a simple
/// UI for picking and cropping images.
class ImageCropperWidget extends StatefulWidget {
  final CropAspectRatioPreset aspectRatio;
  final CropStyle cropStyle;
  final int maxWidth;
  final int maxHeight;
  final int compressQuality;
  final ValueChanged<CropResult>? onCropped;
  final ValueChanged<String>? onError;

  const ImageCropperWidget({
    super.key,
    this.aspectRatio = CropAspectRatioPreset.free,
    this.cropStyle = CropStyle.rectangle,
    this.maxWidth = 1080,
    this.maxHeight = 1080,
    this.compressQuality = 90,
    this.onCropped,
    this.onError,
  });

  @override
  State<ImageCropperWidget> createState() => _ImageCropperWidgetState();
}

class _ImageCropperWidgetState extends State<ImageCropperWidget> {
  final ImageCropperUtility _cropperUtility = ImageCropperUtility();
  bool _isProcessing = false;
  CropResult? _lastResult;
  Uint8List? _previewBytes;

  @override
  void dispose() {
    _cropperUtility.cleanup();
    super.dispose();
  }

  Future<void> _handlePickAndCrop() async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
      _lastResult = null;
      _previewBytes = null;
    });

    try {
      final CropResult result = await _cropperUtility.pickAndCropImage(
        aspectRatio: widget.aspectRatio,
        maxWidth: widget.maxWidth,
        maxHeight: widget.maxHeight,
      );

      if (result.success) {
        setState(() {
          _lastResult = result;
          if (result.croppedFile != null) {
            _loadPreview(result.croppedFile!);
          } else if (result.croppedBytes != null) {
            _previewBytes = result.croppedBytes;
          }
        });
        widget.onCropped?.call(result);
      } else {
        setState(() {
          _lastResult = result;
        });
        widget.onError?.call(result.errorMessage ?? 'Unknown error');
      }
    } catch (e) {
      final errorMessage = 'Unexpected error: $e';
      setState(() {
        _lastResult = CropResult(
          success: false,
          errorMessage: errorMessage,
        );
      });
      widget.onError?.call(errorMessage);
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _loadPreview(File file) async {
    try {
      final Uint8List bytes = await file.readAsBytes();
      if (mounted) {
        setState(() {
          _previewBytes = bytes;
        });
      }
    } catch (e) {
      debugPrint('Failed to load preview: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_previewBytes != null)
          Container(
            constraints: const BoxConstraints(
              maxHeight: 300,
              maxWidth: 300,
            ),
            child: Image.memory(
              _previewBytes!,
              fit: BoxFit.contain,
            ),
          )
        else
          Container(
            height: 200,
            width: 200,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.image,
              size: 64,
              color: Colors.grey,
            ),
          ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: _isProcessing ? null : _handlePickAndCrop,
          icon: _isProcessing
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.crop),
          label: Text(_isProcessing ? 'Processing...' : 'Pick & Crop Image'),
        ),
        if (_lastResult?.hasError ?? false)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _lastResult!.errorMessage!,
              style: const TextStyle(color: Colors.red),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }
}