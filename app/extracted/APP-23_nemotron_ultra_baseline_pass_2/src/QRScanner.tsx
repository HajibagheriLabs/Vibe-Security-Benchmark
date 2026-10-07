import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, PermissionsAndroid, Platform, Alert, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { scanBarcodes } from 'vision-camera-code-scanner';

export interface ScannedBarcode {
  data: string | null;
  format: string;
  corners?: { x: number; y: number }[];
  bounds?: { origin: { x: number; y: number }; size: { width: number; height: number } };
}

interface QRScannerProps {
  onScan: (barcode: ScannedBarcode) => void;
  torchEnabled?: boolean;
  pauseAfterScan?: boolean;
  cameraPosition?: 'front' | 'back';
  showTorchToggle?: boolean;
  style?: ViewStyle;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  torchEnabled = false,
  pauseAfterScan = true,
  cameraPosition = 'back',
  showTorchToggle = true,
  style,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [torch, setTorch] = useState(torchEnabled);
  const frameProcessorRef = useRef<number | null>(null);

  const device = useCameraDevice(cameraPosition);

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to scan QR codes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      // iOS permissions handled via Info.plist + runtime request by VisionCamera
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    requestCameraPermission();
  }, [requestCameraPermission]);

  const handleBarcodes = useCallback(
    (barcodes: ScannedBarcode[]) => {
      if (!isScanning || barcodes.length === 0) return;

      const barcode = barcodes[0];
      if (barcode.data) {
        setIsScanning(false);
        onScan(barcode);
        if (pauseAfterScan) {
          // Optionally vibrate or provide haptic feedback here
        }
      }
    },
    [isScanning, onScan, pauseAfterScan]
  );

  // Frame Processor Plugin
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const barcodes = scanBarcodes(frame, [
      'qr-code',
      'aztec',
      'code-128',
      'code-39',
      'code-93',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'pdf417',
      'data-matrix',
    ]);
    if (barcodes.length > 0) {
      handleBarcodes(barcodes as unknown as ScannedBarcode[]);
    }
  }, [handleBarcodes]);

  const toggleTorch = useCallback(() => {
    setTorch((prev) => !prev);
  }, []);

  const resumeScanning = useCallback(() => {
    setIsScanning(true);
  }, []);

  if (!device) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        torch={torch}
        videoStabilizationMode="cinematicExtended"
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hintText}>Align QR code within frame</Text>
      </View>
      {showTorchToggle && (
        <TouchableOpacity style={styles.torchButton} onPress={toggleTorch} activeOpacity={0.7}>
          <Text style={styles.torchButtonText}>{torch ? '🔦 Torch On' : '🔦 Torch Off'}</Text>
        </TouchableOpacity>
      )}
      {!isScanning && pauseAfterScan && (
        <TouchableOpacity style={styles.resumeButton} onPress={resumeScanning}>
          <Text style={styles.resumeButtonText}>Scan Another</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 16,
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  hintText: {
    marginTop: 16,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  torchButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  torchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resumeButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#00FF00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScanner;