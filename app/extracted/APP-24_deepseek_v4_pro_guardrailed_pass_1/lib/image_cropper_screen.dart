import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';

import 'image_cropping_utility.dart';

/// A reusable screen for image cropping with proper security controls.
/// 
/// Security: All file operations are confined to app's temporary directory.
/// No sensitive data is displayed or logged.
class ImageCropperScreen extends StatefulWidget {
  final String imagePath;
  final CropAspectRatioPreset initialAspectRatio;
  final bool lockAspectRatio;
  final CropStyle cropStyle;
  final int maxWidth;
  final int maxHeight;
  final int compressQuality;
  final Function(String croppedImagePath)? onCropped;
  final Function()? onCancel;
  
  const ImageCropperScreen({
    super.key,
    required this.imagePath,
    this.initialAspectRatio = CropAspectRatioPreset.free,
    this.lockAspectRatio = false,
    this.cropStyle = CropStyle.rectangle,
    this.maxWidth = 2048,
    this.maxHeight = 2048,
    this.compressQuality = 90,
    this.onCropped,
    this.onCancel,
  });
  
  @override
  State<ImageCropperScreen> createState() => _ImageCropperScreenState();
}

class _ImageCropperScreenState extends State<ImageCropperScreen> {
  final ImageCroppingUtility _croppingUtility = ImageCroppingUtility();
  bool _isProcessing = false;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    _validateAndLoadImage();
  }
  
  Future<void> _validateAndLoadImage() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });
    
    final bool isValid = await _croppingUtility.validateImageFile(widget.imagePath);
    
    if (!isValid) {
      setState(() {
        _isProcessing = false;
        _errorMessage = 'Invalid or corrupted image file';
      });
      return;
    }
    
    setState(() {
      _isProcessing = false;
    });
  }
  
  Future<void> _startCropping() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });
    
    try {
      final String? croppedPath = await _croppingUtility.cropImage(
        imagePath: widget.imagePath,
        aspectRatio: widget.initialAspectRatio,
        lockAspectRatio: widget.lockAspectRatio,
        cropStyle: widget.cropStyle,
        maxWidth: widget.maxWidth,
        maxHeight: widget.maxHeight,
        compressQuality: widget.compressQuality,
      );
      
      if (croppedPath != null && mounted) {
        widget.onCropped?.call(croppedPath);
        Navigator.of(context).pop(croppedPath);
      } else if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Failed to crop image';
        });
      }
      debugPrint('Error cropping image: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crop Image'),
        actions: [
          TextButton(
            onPressed: _isProcessing ? null : _startCropping,
            child: const Text('Crop'),
          ),
        ],
      ),
      body: Center(
        child: _isProcessing
            ? const CircularProgressIndicator()
            : _errorMessage != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          widget.onCancel?.call();
                          Navigator.of(context).pop();
                        },
                        child: const Text('Go Back'),
                      ),
                    ],
                  )
                : Image.file(
                    File(widget.imagePath),
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.broken_image,
                            size: 64,
                          ),
                          const SizedBox(height: 16),
                          const Text('Failed to load image'),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () {
                              widget.onCancel?.call();
                              Navigator.of(context).pop();
                            },
                            child: const Text('Go Back'),
                          ),
                        ],
                      );
                    },
                  ),
      ),
    );
  }
}