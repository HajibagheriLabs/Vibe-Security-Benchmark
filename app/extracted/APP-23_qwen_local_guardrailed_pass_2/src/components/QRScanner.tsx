import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Camera } from 'react-native-camera';
import { PERMISSIONS, RESULTS, request, check } from 'react-native-permissions';

// Rule 3: No vendor secrets in bundle. Camera permissions are standard.
// Rule 1: No sensitive data stored in local state beyond render cycle unless persisted securely.

interface QRScannerProps {
  onScanSuccess: (data: string) => void;
  onScanError?: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);

  // Rule 4: Deep link/scan result is untrusted input.
  // We validate format in the parent or downstream consumer, but here we ensure it's a string.
  const handleBarCodeRead = (e: any) => {
    if (!scanning) return;

    setScanning(false);
    const rawData = e?.data;

    if (rawData && typeof rawData === 'string') {
      // Rule 4: Reject, never repair. Ensure it's not empty.
      if (rawData.trim().length > 0) {
        onScanSuccess(rawData);
      } else {
        onScanError?.('Empty QR code');
        resetScanner();
      }
    } else {
      onScanError?.('Invalid scan data');
      resetScanner();
    }
  };

  const resetScanner = () => {
    // Allow rescan after a brief delay
    setTimeout(() => setScanning(true), 1000);
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const permission = PERMISSIONS.IOS.CAMERA;
      const result = await check(permission);

      if (result === RESULTS.UNAVAILABLE || result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        setHasPermission(requestResult === RESULTS.GRANTED);
      } else {
        setHasPermission(result === RESULTS.GRANTED);
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
    }
  };

  const toggleFlash = () => {
    setFlashOn((prev) => !prev);
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.preview}
        type={Camera.Constants.Type.back}
        barCodeRead={handleBarCodeRead}
        barCodeScannerSettings={{
          type: Camera.Constants.BarCodeType.qr,
        }}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
      />
      
      {/* Rule 2: Overlay UI. No interactive nodes inside the camera view that could leak context. */}
      <View style={styles.overlay}>
        <View style={styles.scannerBox}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
        <Text style={styles.instructionText}>
          Align QR code within the frame
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
          <Text style={styles.flashButtonText}>
            {flashOn ? 'Flash Off' : 'Flash On'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => resetScanner()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF00',
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00FF00',
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF00',
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00FF00',
  },
  instructionText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  flashButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
  },
  flashButtonText: {
    color: 'white',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: 'white',
  },
  permissionText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 50,
    padding: 20,
  },
});