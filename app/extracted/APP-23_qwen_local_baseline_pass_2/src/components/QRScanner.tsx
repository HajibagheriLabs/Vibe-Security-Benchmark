import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { BarcodeScanningResult, useBarcodeScanner } from 'react-native-vision-camera';

interface QRScannerProps {
  onScanSuccess: (result: BarcodeScanningResult) => void;
  onScanError?: (error: Error) => void;
  isActive?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isActive = true,
}) => {
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(true);

  // Initialize barcode scanner
  const barcodeScanner = useBarcodeScanner({
    barcodeTypes: ['qr'],
  });

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      try {
        const status = await Camera.requestCameraPermission();
        if (mounted) {
          setHasPermission(status === 'granted');
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setHasPermission(false);
          setLoading(false);
          if (onScanError) {
            onScanError(error as Error);
          }
        }
      }
    };

    checkPermission();

    return () => {
      mounted = false;
    };
  }, [onScanError]);

  // Handle barcode scanning
  const handleBarcodesScanned = useCallback(
    (results: BarcodeScanningResult[]) => {
      if (!isScanning || !isActive) return;

      if (results.length > 0) {
        const result = results[0];
        setIsScanning(false);
        
        // Stop scanning immediately to prevent multiple triggers
        barcodeScanner.stop();
        
        onScanSuccess(result);
      }
    },
    [isScanning, isActive, barcodeScanner, onScanSuccess]
  );

  // Start/stop scanner based on props
  useEffect(() => {
    if (isActive && hasPermission && device) {
      barcodeScanner.start();
    } else {
      barcodeScanner.stop();
    }
  }, [isActive, hasPermission, device, barcodeScanner]);

  const toggleScanning = () => {
    if (isScanning) {
      barcodeScanner.stop();
      setIsScanning(false);
    } else {
      barcodeScanner.start();
      setIsScanning(true);
    }
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && isScanning}
        barcodeScanner={barcodeScanner}
        onBarcodesScanned={handleBarcodesScanned}
      />
      
      {/* Overlay UI */}
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>
        
        <Text style={styles.instructionText}>
          Point camera at QR code
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={toggleScanning}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Stop Scanning' : 'Start Scanning'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF00',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00FF00',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF00',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00FF00',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default QRScanner;