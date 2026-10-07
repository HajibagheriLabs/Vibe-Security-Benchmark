import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform, PermissionsAndroid, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, CodeScanner, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

interface BarcodeResult {
  value: string;
  format: string;
  bounds: { x: number; y: number; width: number; height: number } | null;
  timestamp: number;
}

interface BarcodeScannerProps {
  onBarcodeScanned: (result: BarcodeResult) => void;
  torchEnabled?: boolean;
  pauseAfterScan?: boolean;
  showTorchButton?: boolean;
  cameraPosition?: 'front' | 'back';
  style?: ViewStyle;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  torchEnabled = false,
  pauseAfterScan = true,
  showTorchButton = true,
  cameraPosition = 'back',
  style,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(torchEnabled);
  const lastScannedRef = useRef<string | null>(null);
  const codeScannerRef = useRef<CodeScanner | null>(null);

  const device = useCameraDevice(cameraPosition);
  const permission = useCameraPermission();

  // Request permissions on mount
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to scan barcodes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasPermission(permission === 'authorized');
      }
    };
    requestPermission();
  }, [permission]);

  // Initialize CodeScanner worklet
  useEffect(() => {
    if (device) {
      codeScannerRef.current = new CodeScanner({
        formats: [
          'aztec',
          'code_128',
          'code_39',
          'code_93',
          'codabar',
          'data_matrix',
          'ean_13',
          'ean_8',
          'itf',
          'pdf417',
          'qr_code',
          'upc_a',
          'upc_e',
        ],
      });
    }
  }, [device]);

  // Frame Processor: runs on UI thread at 30-60fps
  const frameProcessor = useFrameProcessor((frame) => {
    if (!isScanning || !codeScannerRef.current) return;

    const barcodes = codeScannerRef.current.scanBarcodes(frame);
    if (barcodes.length > 0) {
      const barcode = barcodes[0];
      const result: BarcodeResult = {
        value: barcode.value ?? '',
        format: barcode.format ?? 'unknown',
        bounds: barcode.bounds
          ? {
              x: barcode.bounds.origin.x,
              y: barcode.bounds.origin.y,
              width: barcode.bounds.size.width,
              height: barcode.bounds.size.height,
            }
          : null,
        timestamp: Date.now(),
      };

      // Prevent duplicate scans within 1.5s
      if (result.value !== lastScannedRef.current) {
        lastScannedRef.current = result.value;
        runOnJS(handleBarcodeScanned)(result);
      }
    }
  }, [isScanning]);

  const handleBarcodeScanned = useCallback((result: BarcodeResult) => {
    onBarcodeScanned(result);
    if (pauseAfterScan) {
      setIsScanning(false);
      // Auto-resume after 2s if needed
      setTimeout(() => setIsScanning(true), 2000);
    }
  }, [onBarcodeScanned, pauseAfterScan]);

  const toggleTorch = useCallback(() => {
    setTorchOn((prev) => !prev);
  }, []);

  const resumeScanning = useCallback(() => {
    lastScannedRef.current = null;
    setIsScanning(true);
  }, []);

  if (!hasPermission) {
    return (
      <View style={[styles.container, style, styles.permissionContainer]}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => Alert.alert('Permission Required', 'Please enable camera access in settings.')}>
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, style, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Initializing camera...</Text>
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
        frameProcessorFps={30}
        torch={torchOn}
        videoStabilizationMode="cinematicExtended"
      />

      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanWindow}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
          <View style={styles.scanLine} />
        </View>
        <Text style={styles.hintText}>Align barcode within frame</Text>
      </View>

      {/* Torch button */}
      {showTorchButton && device.hasTorch && (
        <TouchableOpacity style={styles.torchButton} onPress={toggleTorch} accessibilityLabel="Toggle flashlight">
          <Text style={styles.torchButtonText}>{torchOn ? '🔦' : '💡'}</Text>
        </TouchableOpacity>
      )}

      {/* Pause overlay */}
      {!isScanning && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseText}>Scanned: {lastScannedRef.current}</Text>
          <TouchableOpacity style={styles.resumeButton} onPress={resumeScanning}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanWindow: {
    width: 280,
    height: 180,
    borderWidth: 0,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00ff88',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00ff88',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00ff88',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00ff88',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00ff88',
    opacity: 0.8,
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  torchButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  torchButtonText: {
    fontSize: 24,
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 20,
  },
  pauseText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  resumeButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007aff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Type augmentation for StyleSheet
type ViewStyle = React.NativeStyle<View>;