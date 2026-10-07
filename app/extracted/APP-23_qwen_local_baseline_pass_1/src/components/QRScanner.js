// src/components/QRScanner.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  CameraView,
  useCameraPermission,
} from 'expo-camera';

const QRScanner = ({ onScanSuccess, onScanError }) => {
  const [facing, setFacing] = useState('back');
  const [scanned, setScanned] = useState(false);
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    const checkPermission = async () => {
      if (!hasPermission) {
        const permission = await requestPermission();
        if (!permission) {
          Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes.');
        }
      }
    };
    checkPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    
    // Validate that it's a QR code if necessary, though type usually handles this
    if (type === 'qr') {
      if (onScanSuccess) {
        onScanSuccess(data);
      } else {
        Alert.alert('QR Code Scanned', `Data: ${data}`);
      }
    } else {
      if (onScanError) {
        onScanError('Invalid barcode type');
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const resetScanner = () => {
    setScanned(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            {/* Corner markers for visual feedback */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.hintText}>
            {scanned ? 'Scan Complete' : 'Point camera at QR Code'}
          </Text>

          {!scanned && (
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.buttonText}>Switch Camera</Text>
            </TouchableOpacity>
          )}
          
          {scanned && (
            <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={resetScanner}>
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 5,
    position: 'absolute',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  hintText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    marginTop: 20,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  resetButton: {
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default QRScanner;