// lib/widgets/crop_editor.dart
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../image_cropper_native.dart';

/// A widget that provides an interactive image cropping interface.
///
/// This widget displays an image with an adjustable crop rectangle overlay,
/// allowing users to visually select the area to crop.
class CropEditor extends StatefulWidget {
  /// The source image bytes.
  final Uint8List imageBytes;

  /// Called when the user confirms the crop.
  final ValueChanged<Uint8List>? onCropConfirmed;

  /// Called when the user cancels the crop operation.
  final VoidCallback? onCancel;

  /// The initial crop rectangle (normalized 0.0-1.0).
  final Rect? initialCropRect;

  /// The aspect ratio to enforce (width / height). Null for free-form.
  final double? aspectRatio;

  const CropEditor({
    super.key,
    required this.imageBytes,
    this.onCropConfirmed,
    this.onCancel,
    this.initialCropRect,
    this.aspectRatio,
  });

  @override
  State<CropEditor> createState() => _CropEditorState();
}

class _CropEditorState extends State<CropEditor> {
  Rect? _cropRect;
  Offset? _dragStart;
  _DragMode _dragMode = _DragMode.none;
  int _imageWidth = 0;
  int _imageHeight = 0;

  @override
  void initState() {
    super.initState();
    _decodeImageDimensions();
    _cropRect = widget.initialCropRect ??
        const Rect.fromLTRB(0.1, 0.1, 0.9, 0.9);
  }

  Future<void> _decodeImageDimensions() async {
    final decoded = await decodeImageFromList(widget.imageBytes);
    if (mounted) {
      setState(() {
        _imageWidth = decoded.width;
        _imageHeight = decoded.height;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Stack(
          children: [
            // Image display
            Positioned.fill(
              child: Image.memory(
                widget.imageBytes,
                fit: BoxFit.contain,
              ),
            ),
            // Crop overlay
            if (_cropRect != null)
              Positioned.fill(
                child: _buildCropOverlay(constraints),
              ),
            // Controls
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: _buildControls(),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCropOverlay(BoxConstraints constraints) {
    final rect = _cropRect!;
    final pixelRect = Rect.fromLTRB(
      rect.left * constraints.maxWidth,
      rect.top * constraints.maxHeight,
      rect.right * constraints.maxWidth,
      rect.bottom * constraints.maxHeight,
    );

    return GestureDetector(
      onPanStart: (details) => _handleDragStart(details.localPosition, pixelRect),
      onPanUpdate: (details) => _handleDragUpdate(details.localPosition, constraints),
      onPanEnd: (_) => _dragMode = _DragMode.none,
      child: CustomPaint(
        painter: _CropOverlayPainter(
          cropRect: pixelRect,
          dragMode: _dragMode,
        ),
      ),
    );
  }

  Widget _buildControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        ElevatedButton(
          onPressed: widget.onCancel,
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 16),
        ElevatedButton(
          onPressed: _confirmCrop,
          child: const Text('Crop'),
        ),
      ],
    );
  }

  void _handleDragStart(Offset position, Rect pixelRect) {
    const handleSize = 30.0;

    // Check if dragging a corner handle
    final handles = _getHandlePositions(pixelRect);
    for (final entry in handles.entries) {
      if ((position - entry.value).distance < handleSize) {
        _dragMode = entry.key;
        _dragStart = position;
        return;
      }
    }

    // Check if dragging inside the crop rect (move mode)
    if (pixelRect.contains(position)) {
      _dragMode = _DragMode.move;
      _dragStart = position;
    }
  }

  void _handleDragUpdate(Offset position, BoxConstraints constraints) {
    if (_dragMode == _DragMode.none || _dragStart == null) return;

    final delta = position - _dragStart!;
    _dragStart = position;

    setState(() {
      final current = _cropRect!;
      final dx = delta.dx / constraints.maxWidth;
      final dy = delta.dy / constraints.maxHeight;

      switch (_dragMode) {
        case _DragMode.move:
          _cropRect = Rect.fromLTRB(
            (current.left + dx).clamp(0.0, 1.0 - current.width),
            (current.top + dy).clamp(0.0, 1.0 - current.height),
            (current.right + dx).clamp(current.width, 1.0),
            (current.bottom + dy).clamp(current.height, 1.0),
          );
          break;
        case _DragMode.topLeft:
          _cropRect = Rect.fromLTRB(
            (current.left + dx).clamp(0.0, current.right - 0.05),
            (current.top + dy).clamp(0.0, current.bottom - 0.05),
            current.right,
            current.bottom,
          );
          break;
        case _DragMode.topRight:
          _cropRect = Rect.fromLTRB(
            current.left,
            (current.top + dy).clamp(0.0, current.bottom - 0.05),
            (current.right + dx).clamp(current.left + 0.05, 1.0),
            current.bottom,
          );
          break;
        case _DragMode.bottomLeft:
          _cropRect = Rect.fromLTRB(
            (current.left + dx).clamp(0.0, current.right - 0.05),
            current.top,
            current.right,
            (current.bottom + dy).clamp(current.top + 0.05, 1.0),
          );
          break;
        case _DragMode.bottomRight:
          _cropRect = Rect.fromLTRB(
            current.left,
            current.top,
            (current.right + dx).clamp(current.left + 0.05, 1.0),
            (current.bottom + dy).clamp(current.top + 0.05, 1.0),
          );
          break;
        case _DragMode.none:
          break;
      }

      // Enforce aspect ratio if specified
      if (widget.aspectRatio != null) {
        _enforceAspectRatio();
      }
    });
  }

  void _enforceAspectRatio() {
    final rect = _cropRect!;
    final currentRatio = rect.width / rect.height;
    final targetRatio = widget.aspectRatio!;

    if ((currentRatio - targetRatio).abs() < 0.01) return;

    if (currentRatio > targetRatio) {
      // Too wide, reduce width
      final newWidth = rect.height * targetRatio;
      final centerX = (rect.left + rect.right) / 2;
      _cropRect = Rect.fromLTRB(
        (centerX - newWidth / 2).clamp(0.0, 1.0 - newWidth),
        rect.top,
        (centerX + newWidth / 2).clamp(newWidth, 1.0),
        rect.bottom,
      );
    } else {
      // Too tall, reduce height
      final newHeight = rect.width / targetRatio;
      final centerY = (rect.top + rect.bottom) / 2;
      _cropRect = Rect.fromLTRB(
        rect.left,
        (centerY - newHeight / 2).clamp(0.0, 1.0 - newHeight),
        rect.right,
        (centerY + newHeight / 2).clamp(newHeight, 1.0),
      );
    }
  }

  Map<_DragMode, Offset> _getHandlePositions(Rect pixelRect) {
    return {
      _DragMode.topLeft: Offset(pixelRect.left, pixelRect.top),
      _DragMode.topRight: Offset(pixelRect.right, pixelRect.top),
      _DragMode.bottomLeft: Offset(pixelRect.left, pixelRect.bottom),
      _DragMode.bottomRight: Offset(pixelRect.right, pixelRect.bottom),
    };
  }

  Future<void> _confirmCrop() async {
    if (_cropRect == null || _imageWidth == 0 || _imageHeight == 0) return;

    final pixelRect = Rect.fromLTRB(
      _cropRect!.left * _imageWidth,
      _cropRect!.top * _imageHeight,
      _cropRect!.right * _imageWidth,
      _cropRect!.bottom * _imageHeight,
    );

    final croppedBytes = await ImageCropperNative.cropImageFromBytes(
      bytes: widget.imageBytes,
      cropRect: pixelRect,
    );

    widget.onCropConfirmed?.call(croppedBytes);
  }
}

enum _DragMode {
  none,
  move,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}

class _CropOverlayPainter extends CustomPainter {
  final Rect cropRect;
  final _DragMode dragMode;

  _CropOverlayPainter({
    required this.cropRect,
    required this.dragMode,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Dim the area outside the crop rectangle
    final dimPaint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(Offset.zero & size)
      ..addRect(cropRect);
    canvas.drawPath(path, dimPaint);

    // Draw crop rectangle border
    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawRect(cropRect, borderPaint);

    // Draw grid lines
    final gridPaint = Paint()
      ..color = Colors.white.withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;

    for (var i = 1; i < 3; i++) {
      final x = cropRect.left + (cropRect.width * i / 3);
      final y = cropRect.top + (cropRect.height * i / 3);
      canvas.drawLine(
        Offset(x, cropRect.top),
        Offset(x, cropRect.bottom),
        gridPaint,
      );
      canvas.drawLine(
        Offset(cropRect.left, y),
        Offset(cropRect.right, y),
        gridPaint,
      );
    }

    // Draw corner handles
    final handlePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final handleSize = 12.0;
    final corners = [
      Offset(cropRect.left, cropRect.top),
      Offset(cropRect.right, cropRect.top),
      Offset(cropRect.left, cropRect.bottom),
      Offset(cropRect.right, cropRect.bottom),
    ];

    for (final corner in corners) {
      canvas.drawCircle(corner, handleSize, handlePaint);
      canvas.drawCircle(
        corner,
        handleSize,
        Paint()
          ..color = Colors.blue
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CropOverlayPainter oldDelegate) {
    return oldDelegate.cropRect != cropRect || oldDelegate.dragMode != dragMode;
  }
}