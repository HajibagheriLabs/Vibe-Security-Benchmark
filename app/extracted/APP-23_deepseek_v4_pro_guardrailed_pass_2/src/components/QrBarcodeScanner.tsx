// src/components/QrBarcodeScanner.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

type ScanResult = {
  value: string;
  type: string;
};

type QrBarcodeScannerProps = {
  onScan: (result: ScanResult) => void;
  onClose?: () => void;
  scanInterval?: number;
  enabled?: boolean;
};

const SCAN_DEBOUNCE_MS = 1500;

const QrBarcodeScanner: React.FC<QrBarcodeScannerProps> = ({
  onScan,
  onClose,
  scanInterval = SCAN_DEBOUNCE_MS,
  enabled = true,
}) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(true);
  const lastScanTime = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleScan = useCallback(
    (codes: any[]) => {
      if (!enabled || isProcessing.current) return;

      const now = Date.now();
      if (now - lastScanTime.current < scanInterval) return;

      const code = codes[0];
      if (!code?.value) return;

      isProcessing.current = true;
      lastScanTime.current = now;

      // Pause scanning briefly to prevent duplicate reads
      setIsActive(false);

      onScan({
        value: code.value,
        type: code.type ?? 'unknown',
      });

      // Resume scanning after debounce
      setTimeout(() => {
        isProcessing.current = false;
        setIsActive(true);
      }, scanInterval);
    },
    [enabled, onScan, scanInterval],
  );

  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'code-128',
      'code-39',
      'code-93',
      'codabar',
      'itf',
      'aztec',
      'data-matrix',
      'pdf-417',
    ],
    onCodeScanned: handleScan,
  });

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera permission is required to scan codes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.message}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && enabled}
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Align the code within the frame</Text>
      </View>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  message: {
    color: '#fff',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default QrBarcodeScanner;