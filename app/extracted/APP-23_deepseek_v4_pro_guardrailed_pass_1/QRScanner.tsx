import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  CodeScanner,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { PERMISSIONS, RESULTS, request } from 'react-native-permissions';

interface QRScannerProps {
  onScan: (value: string) => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
  active?: boolean;
  style?: object;
}

/**
 * QR/Barcode scanner component using react-native-vision-camera.
 * Security note: scanned values are treated as untrusted input and
 * passed to the caller for validation. This component never navigates
 * or mutates state based on scanned content directly.
 */
const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  onPermissionDenied,
  active = true,
  style,
}) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScannedValue = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  // Request camera permission on mount
  useEffect(() => {
    const checkAndRequestPermission = async () => {
      try {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
          await requestPermission();
        } else if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
          onPermissionDenied?.();
        }
      } catch (error) {
        onError?.(error as Error);
      }
    };

    checkAndRequestPermission();
  }, [requestPermission, onPermissionDenied, onError]);

  // Debounce duplicate scans (prevent rapid-fire of same QR code)
  const isDuplicateScan = useCallback((value: string): boolean => {
    const now = Date.now();
    if (
      lastScannedValue.current === value &&
      now - lastScanTime.current < 2000
    ) {
      return true;
    }
    lastScannedValue.current = value;
    lastScanTime.current = now;
    return false;
  }, []);

  // Handle scanned codes
  const handleScan = useCallback(
    (codes: { value: string }[]) => {
      if (!active || isProcessing || codes.length === 0) {
        return;
      }

      const scannedValue = codes[0].value;

      // Security: validate scanned content is a string and non-empty
      if (typeof scannedValue !== 'string' || scannedValue.trim() === '') {
        return;
      }

      // Security: reject dangerous URL schemes from scanned content
      // The caller is responsible for further validation
      if (
        scannedValue.startsWith('javascript:') ||
        scannedValue.startsWith('data:') ||
        scannedValue.startsWith('file:') ||
        scannedValue.startsWith('intent:') ||
        scannedValue.startsWith('blob:')
      ) {
        onError?.(new Error('Unsafe URL scheme detected in scanned content'));
        return;
      }

      if (isDuplicateScan(scannedValue)) {
        return;
      }

      setIsProcessing(true);
      try {
        onScan(scannedValue);
      } catch (error) {
        onError?.(error as Error);
      } finally {
        // Brief pause to prevent rapid re-scanning
        setTimeout(() => {
          setIsProcessing(false);
        }, 500);
      }
    },
    [active, isProcessing, onScan, onError, isDuplicateScan]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'upc-a', 'upc-e'],
    onCodeScanned: handleScan,
  });

  // Handle camera errors
  const onCameraError = useCallback(
    (error: Error) => {
      onError?.(error);
    },
    [onError]
  );

  // Render permission denied state
  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            Linking.openSettings();
          }}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render no device state
  if (device == null) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={active && isScanning}
        codeScanner={codeScanner}
        onError={onCameraError}
        photo={false}
        video={false}
        audio={false}
      />
      {/* Scan overlay frame */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.instructionText}>
          Point camera at a QR code or barcode
        </Text>
      </View>
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionText: {
    color: '#333333',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
});

export default QRScanner;