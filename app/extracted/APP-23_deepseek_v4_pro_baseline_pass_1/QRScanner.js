import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Vibration,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const QRScanner = ({
  onScan,
  onClose,
  visible = false,
  showTorchButton = true,
  vibrateOnScan = true,
  scanDelay = 1000,
  title = 'Scan QR Code',
  closeButtonText = 'Close',
  torchButtonText = 'Torch',
  permissionDeniedText = 'Camera permission is required to scan QR codes.',
  permissionDeniedButtonText = 'Open Settings',
  style,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanLocked, setIsScanLocked] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const devices = useCameraDevices();
  const device = devices.back;

  const [frameProcessor, barcodes] = useScanBarcodes(
    [BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128],
    { checkInverted: true }
  );

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  useEffect(() => {
    if (barcodes && barcodes.length > 0 && !isScanLocked && visible) {
      const barcode = barcodes[0];
      handleBarcodeScanned(barcode);
    }
  }, [barcodes, isScanLocked, visible]);

  const requestCameraPermission = useCallback(async () => {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.CAMERA,
        android: PERMISSIONS.ANDROID.CAMERA,
      });

      if (!permission) {
        setHasPermission(false);
        return;
      }

      const result = await request(permission);
      
      if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
        setHasPermission(true);
        setIsPermissionDenied(false);
      } else {
        setHasPermission(false);
        setIsPermissionDenied(true);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
      setIsPermissionDenied(true);
    }
  }, []);

  const handleBarcodeScanned = useCallback(
    (barcode) => {
      if (!barcode || !barcode.displayValue) return;

      setIsScanLocked(true);

      if (vibrateOnScan) {
        Vibration.vibrate(100);
      }

      if (onScan) {
        onScan({
          value: barcode.displayValue,
          rawValue: barcode.rawValue,
          format: barcode.format,
          bounds: barcode.bounds,
        });
      }

      // Auto-unlock after delay
      setTimeout(() => {
        setIsScanLocked(false);
      }, scanDelay);
    },
    [onScan, vibrateOnScan, scanDelay]
  );

  const toggleTorch = useCallback(() => {
    setIsTorchOn((prev) => !prev);
  }, []);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, style]}>
        {!hasPermission && !isPermissionDenied && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Requesting camera permission...</Text>
          </View>
        )}

        {isPermissionDenied && (
          <View style={styles.permissionDeniedContainer}>
            <Text style={styles.permissionDeniedIcon}>📷</Text>
            <Text style={styles.permissionDeniedText}>{permissionDeniedText}</Text>
            <TouchableOpacity
              style={styles.permissionDeniedButton}
              onPress={handleOpenSettings}
            >
              <Text style={styles.permissionDeniedButtonText}>
                {permissionDeniedButtonText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>{closeButtonText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasPermission && device && (
          <View style={styles.cameraContainer}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              frameProcessor={frameProcessor}
              frameProcessorFps={5}
              torch={isTorchOn ? 'on' : 'off'}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>{closeButtonText}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scanArea}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.instructionText}>
                  Point your camera at a QR code or barcode
                </Text>
                {showTorchButton && (
                  <TouchableOpacity
                    style={[
                      styles.torchButton,
                      isTorchOn && styles.torchButtonActive,
                    ]}
                    onPress={toggleTorch}
                  >
                    <Text style={styles.torchButtonText}>
                      {isTorchOn ? '🔦 On' : '🔦 Off'} {torchButtonText}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {hasPermission && !device && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Loading camera...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000000',
  },
  permissionDeniedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  permissionDeniedText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionDeniedButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionDeniedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00FF00',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  torchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  torchButtonActive: {
    backgroundColor: 'rgba(255, 255, 0, 0.3)',
  },
  torchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default QRScanner;