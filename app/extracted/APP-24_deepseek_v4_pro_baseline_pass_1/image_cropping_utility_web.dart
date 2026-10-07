// lib/image_cropping_utility_facade.dart
// Facade that conditionally exports the correct implementation
// based on the platform.

export 'image_cropping_utility_io.dart'
    if (dart.library.html) 'image_cropping_utility_stub.dart';