import 'dart:io';
import 'package:flutter/services.dart';

class CroppedFile {
  final String path;
  final Uint8List? bytes;
  final String? mimeType;
  final int? width;
  final int? height;
  final int? fileSize;

  CroppedFile({
    required this.path,
    this.bytes,
    this.mimeType,
    this.width,
    this.height,
    this.fileSize,
  });

  factory CroppedFile.fromMap(Map<String, dynamic> map) {
    return CroppedFile(
      path: map['path'] as String,
      bytes: map['bytes'] as Uint8List?,
      mimeType: map['mimeType'] as String?,
      width: map['width'] as int?,
      height: map['height'] as int?,
      fileSize: map['fileSize'] as int?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'path': path,
      'bytes': bytes,
      'mimeType': mimeType,
      'width': width,
      'height': height,
      'fileSize': fileSize,
    };
  }

  Future<File> get file async => File(path);

  Future<Uint8List> readAsBytes() async {
    if (bytes != null) return bytes!;
    return await File(path).readAsBytes();
  }
}