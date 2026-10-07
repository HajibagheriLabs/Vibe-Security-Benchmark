#import <Flutter/Flutter.h>
#import <Photos/Photos.h>
#import <UIKit/UIKit.h>

@interface ImageCropperPlugin : NSObject<FlutterPlugin>
@end

@implementation ImageCropperPlugin

+ (void)registerWithRegistrar:(NSObject<FlutterPluginRegistrar>*)registrar {
  FlutterMethodChannel* channel = [FlutterMethodChannel methodChannelWithName:@"com.example.image_cropper/ios" binaryMessenger:[registrar messenger]];
  ImageCropperPlugin* instance = [[ImageCropperPlugin alloc] init];
  [registrar addMethodCallDelegate:instance channel:channel];
}

- (void)handleMethodCall:(FlutterMethodCall*)call result:(FlutterResult)result {
  if ([call.method isEqualToString:@"cropImage"]) {
    NSDictionary* args = call.arguments;
    NSString* sourcePath = args[@"sourcePath"];
    double aspectRatio = [args[@"aspectRatio"] doubleValue];
    NSInteger maxWidth = [args[@"maxWidth"] integerValue];
    NSInteger maxHeight = [args[@"maxHeight"] integerValue];
    NSString* compressFormat = args[@"compressFormat"] ?: @"jpeg";
    NSInteger compressQuality = [args[@"compressQuality"] integerValue];

    [self cropImageAtPath:sourcePath
              aspectRatio:aspectRatio > 0 ? aspectRatio : 0
                  maxWidth:maxWidth > 0 ? maxWidth : 0
                 maxHeight:maxHeight > 0 ? maxHeight : 0
            compressFormat:compressFormat
            compressQuality:compressQuality
                   result:result];
  } else {
    result(FlutterMethodNotImplemented);
  }
}

- (void)cropImageAtPath:(NSString*)sourcePath
             aspectRatio:(double)aspectRatio
                 maxWidth:(NSInteger)maxWidth
                maxHeight:(NSInteger)maxHeight
           compressFormat:(NSString*)compressFormat
           compressQuality:(NSInteger)compressQuality
                  result:(FlutterResult)result {
  NSURL* sourceURL = [NSURL fileURLWithPath:sourcePath];
  PHAsset* asset = [self fetchAssetForURL:sourceURL];
  if (!asset) {
    result(@{@"error": @"ASSET_NOT_FOUND", @"message": @"Could not fetch asset for path"});
    return;
  }

  PHImageRequestOptions* options = [[PHImageRequestOptions alloc] init];
  options.synchronous = YES;
  options.networkAccessAllowed = YES;
  options.deliveryMode = PHImageRequestOptionsDeliveryModeHighQualityFormat;

  [[PHImageManager defaultManager] requestImageForAsset:asset
                                             targetSize:PHImageManagerMaximumSize
                                            contentMode:PHImageContentModeDefault
                                            options:options
                                      resultHandler:^(UIImage* image, NSDictionary* info) {
    if (!image) {
      result(@{@"error": @"IMAGE_LOAD_FAILED", @"message": @"Failed to load image"});
      return;
    }

    UIImage* croppedImage = [self cropImage:image
                                 aspectRatio:aspectRatio
                                     maxWidth:maxWidth
                                    maxHeight:maxHeight];

    NSData* imageData;
    if ([compressFormat.lowercaseString isEqualToString:@"png"]) {
      imageData = UIImagePNGRepresentation(croppedImage);
    } else if ([compressFormat.lowercaseString isEqualToString:@"webp"]) {
      imageData = [UIImageJPEGRepresentation(croppedImage, compressQuality / 100.0) dataUsingEncoding:NSUTF8StringEncoding];
    } else {
      imageData = UIImageJPEGRepresentation(croppedImage, compressQuality / 100.0);
    }

    if (!imageData) {
      result(@{@"error": @"ENCODE_FAILED", @"message": @"Failed to encode image"});
      return;
    }

    NSString* outputPath = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"cropped_%@.%@", [[NSUUID UUID] UUIDString], [compressFormat lowercaseString]]];
    [imageData writeToFile:outputPath atomically:YES];
    result(outputPath);
  }];
}

- (PHAsset*)fetchAssetForURL:(NSURL*)url {
  PHFetchResult<PHAsset*>* assets = [PHAsset fetchAssetsWithALAssetURLs:@[url] options:nil];
  return assets.firstObject;
}

- (UIImage*)cropImage:(UIImage*)image
       aspectRatio:(double)aspectRatio
           maxWidth:(NSInteger)maxWidth
          maxHeight:(NSInteger)maxHeight {
  CGRect cropRect = [self calculateCropRect:image.size aspectRatio:aspectRatio maxWidth:maxWidth maxHeight:maxHeight];

  UIGraphicsBeginImageContextWithOptions(cropRect.size, NO, image.scale);
  [image drawAtPoint:CGPointMake(-cropRect.origin.x, -cropRect.origin.y)];
  UIImage* croppedImage = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();

  return croppedImage ?: image;
}

- (CGRect)calculateCropRect:(CGSize)imageSize aspectRatio:(double)aspectRatio maxWidth:(NSInteger)maxWidth maxHeight:(NSInteger)maxHeight {
  CGFloat targetWidth = imageSize.width;
  CGFloat targetHeight = imageSize.height;

  if (maxWidth > 0 && targetWidth > maxWidth) {
    targetHeight = targetHeight * maxWidth / targetWidth;
    targetWidth = maxWidth;
  }
  if (maxHeight > 0 && targetHeight > maxHeight) {
    targetWidth = targetWidth * maxHeight / targetHeight;
    targetHeight = maxHeight;
  }

  CGFloat cropWidth = targetWidth;
  CGFloat cropHeight = targetHeight;

  if (aspectRatio > 0) {
    if (targetWidth / targetHeight > aspectRatio) {
      cropWidth = targetHeight * aspectRatio;
    } else {
      cropHeight = targetWidth / aspectRatio;
    }
  }

  CGFloat x = (targetWidth - cropWidth) / 2;
  CGFloat y = (targetHeight - cropHeight) / 2;

  return CGRectMake(x, y, cropWidth, cropHeight);
}

@end

---