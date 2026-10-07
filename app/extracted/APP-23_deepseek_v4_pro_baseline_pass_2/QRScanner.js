import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';

const QRScanner = ({
  onScan,
  onClose,
  showTorchButton = true,
  vibrateOnScan = true,
  scanInterval = 1000,
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  frameColor = '#00FF00',
  frameSize = 260,
  title = 'Scan QR Code',
  subtitle = 'Align the QR code within the frame',
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedData, setLastScannedData] = useState(null);
  const lastScanTimeRef = useRef(0);

  const devices = useCameraDevices();
  const device = devices.back;

  const [frameProcessor, barcodes] = useScanBarcodes(
    [BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128],
    {
      checkInverted: true,
    }
  );

  useEffect(() => {
    requestCameraPermission();
  }, []);

  useEffect(() => {
    if (barcodes && barcodes.length > 0 && isScanning) {
      const now = Date.now();
      if (now - lastScanTimeRef.current >= scanInterval) {
        lastScanTimeRef.current = now;
        const barcode = barcodes[0];
        const data = barcode.displayValue || barcode.rawValue;

        if (data && data !== lastScannedData) {
          setLastScannedData(data);
          setIsScanning(false);

          if (vibrateOnScan) {
            Vibration.vibrate(100);
          }

          if (onScan) {
            onScan(data, barcode);
          } else {
            handleDefaultScan(data);
          }
        }
      }
    }
  }, [barcodes, isScanning, scanInterval, lastScannedData, vibrateOnScan, onScan]);

  const requestCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'authorized');
      if (permission !== 'authorized') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to scan QR codes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleDefaultScan = (data) => {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      Alert.alert('QR Code Scanned', data, [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsScanning(true) },
        { text: 'Open Link', onPress: () => Linking.openURL(data) },
        { text: 'Scan Again', onPress: () => setIsScanning(true) },
      ]);
    } else {
      Alert.alert('QR Code Scanned', data, [
        { text: 'Scan Again', onPress: () => setIsScanning(true) },
      ]);
    }
  };

  const toggleTorch = () => {
    setTorchOn((prev) => !prev);
  };

  const resumeScanning = () => {
    setLastScannedData(null);
    setIsScanning(true);
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
        torch={torchOn ? 'on' : 'off'}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { backgroundColor: overlayColor }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.middleRow}>
          <View style={[styles.overlaySide, { backgroundColor: overlayColor }]} />
          <View
            style={[
              styles.scanFrame,
              {
                width: frameSize,
                height: frameSize,
                borderColor: frameColor,
              },
            ]}
          >
            {/* Corner markers */}
            <View style={[styles.cornerTopLeft, { borderColor: frameColor }]} />
            <View style={[styles.cornerTopRight, { borderColor: frameColor }]} />
            <View style={[styles.cornerBottomLeft, { borderColor: frameColor }]} />
            <View style={[styles.cornerBottomRight, { borderColor: frameColor }]} />

            {!isScanning && (
              <View style={styles.scannedOverlay}>
                <Text style={styles.scannedText}>Scanned!</Text>
                <TouchableOpacity style={styles.rescanButton} onPress={resumeScanning}>
                  <Text style={styles.rescanButtonText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={[styles.overlaySide, { backgroundColor: overlayColor }]} />
        </View>

        <View style={[styles.overlayBottom, { backgroundColor: overlayColor }]}>
          <View style={styles.bottomControls}>
            {showTorchButton && (
              <TouchableOpacity style={styles.controlButton} onPress={toggleTorch}>
                <Text style={styles.controlButtonText}>
                  {torchOn ? '🔦 Torch Off' : '🔦 Torch On'}
                </Text>
              </TouchableOpacity>
            )}

            {onClose && (
              <TouchableOpacity style={styles.controlButton} onPress={onClose}>
                <Text style={styles.controlButtonText}>✕ Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ddd',
    fontSize: 14,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlaySide: {
    flex: 1,
    height: 260,
  },
  scanFrame: {
    borderWidth: 2,
    borderRadius: 12,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  scannedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rescanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  overlayBottom: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default QRScanner;