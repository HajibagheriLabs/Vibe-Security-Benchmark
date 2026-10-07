import 'dart:ui';

enum CropAspectRatioPreset {
  original,
  square,
  ratio3x2,
  ratio4x3,
  ratio16x9,
  ratio9x16,
  custom,
}

enum CropStyle {
  rectangle,
  circle,
}

class CropOptions {
  final double? aspectRatio;
  final CropAspectRatioPreset? preset;
  final CropStyle cropStyle;
  final bool compressImage;
  final int compressQuality;
  final int? maxWidth;
  final int? maxHeight;
  final Color? toolbarColor;
  final Color? toolbarWidgetColor;
  final Color? statusBarColor;
  final String? toolbarTitle;
  final bool showCropGrid;
  final bool hideBottomControls;
  final bool enableRotation;
  final bool enableZoom;
  final List<CropAspectRatioPreset>? aspectRatioPresets;
  final Map<String, dynamic>? androidOptions;
  final Map<String, dynamic>? iosOptions;
  final Map<String, dynamic>? webOptions;
  final Map<String, dynamic>? desktopOptions;

  const CropOptions({
    this.aspectRatio,
    this.preset,
    this.cropStyle = CropStyle.rectangle,
    this.compressImage = true,
    this.compressQuality = 90,
    this.maxWidth,
    this.maxHeight,
    this.toolbarColor,
    this.toolbarWidgetColor,
    this.statusBarColor,
    this.toolbarTitle,
    this.showCropGrid = true,
    this.hideBottomControls = false,
    this.enableRotation = true,
    this.enableZoom = true,
    this.aspectRatioPresets,
    this.androidOptions,
    this.iosOptions,
    this.webOptions,
    this.desktopOptions,
  });

  Map<String, dynamic> toMap() {
    return {
      'aspectRatio': aspectRatio,
      'preset': preset?.index,
      'cropStyle': cropStyle.index,
      'compressImage': compressImage,
      'compressQuality': compressQuality,
      'maxWidth': maxWidth,
      'maxHeight': maxHeight,
      'toolbarColor': toolbarColor?.value,
      'toolbarWidgetColor': toolbarWidgetColor?.value,
      'statusBarColor': statusBarColor?.value,
      'toolbarTitle': toolbarTitle,
      'showCropGrid': showCropGrid,
      'hideBottomControls': hideBottomControls,
      'enableRotation': enableRotation,
      'enableZoom': enableZoom,
      'aspectRatioPresets': aspectRatioPresets?.map((e) => e.index).toList(),
      'androidOptions': androidOptions,
      'iosOptions': iosOptions,
      'webOptions': webOptions,
      'desktopOptions': desktopOptions,
    };
  }

  factory CropOptions.fromMap(Map<String, dynamic> map) {
    return CropOptions(
      aspectRatio: map['aspectRatio']?.toDouble(),
      preset: map['preset'] != null
          ? CropAspectRatioPreset.values[map['preset'] as int]
          : null,
      cropStyle: CropStyle.values[map['cropStyle'] as int? ?? 0],
      compressImage: map['compressImage'] as bool? ?? true,
      compressQuality: map['compressQuality'] as int? ?? 90,
      maxWidth: map['maxWidth'] as int?,
      maxHeight: map['maxHeight'] as int?,
      toolbarColor: map['toolbarColor'] != null
          ? Color(map['toolbarColor'] as int)
          : null,
      toolbarWidgetColor: map['toolbarWidgetColor'] != null
          ? Color(map['toolbarWidgetColor'] as int)
          : null,
      statusBarColor: map['statusBarColor'] != null
          ? Color(map['statusBarColor'] as int)
          : null,
      toolbarTitle: map['toolbarTitle'] as String?,
      showCropGrid: map['showCropGrid'] as bool? ?? true,
      hideBottomControls: map['hideBottomControls'] as bool? ?? false,
      enableRotation: map['enableRotation'] as bool? ?? true,
      enableZoom: map['enableZoom'] as bool? ?? true,
      aspectRatioPresets: (map['aspectRatioPresets'] as List<dynamic>?)
          ?.map((e) => CropAspectRatioPreset.values[e as int])
          .toList(),
      androidOptions: map['androidOptions'] as Map<String, dynamic>?,
      iosOptions: map['iosOptions'] as Map<String, dynamic>?,
      webOptions: map['webOptions'] as Map<String, dynamic>?,
      desktopOptions: map['desktopOptions'] as Map<String, dynamic>?,
    );
  }
}