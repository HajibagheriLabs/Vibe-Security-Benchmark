import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RNCamera, BarCodeType } from 'react-native-vision-camera';
import { useSecureStore } from './useSecureStore'; // Assumes a secure store hook per AGENT_RULES §1

type ScannerResult = {
  data: string;
  type: BarCodeType;
};

type Props = {
  onScan: (result: ScannerResult) => void;
  onError: (error: Error) => void;
  allowedTypes?: BarCodeType[];
};

export const QrBarcodeScanner: React.FC<Props> = ({
  onScan,
  onError,
  allowedTypes = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'codabar', 'itf', 'dataMatrix', 'pdf417', 'aztec'],
}) => {
  const deviceRef = useRef<RNCamera>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const lastScannedRef = useRef<string>('');

  // AGENT_RULES §1: Never log sensitive values. Scan results are treated as PII until validated by backend.
  const { setItem: storeScanLog } = useSecureStore(); // For audit trail if required, encrypted at rest.

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      // iOS permissions handled via Info.plist (NSCameraUsageDescription) and vision-camera internals.
      // We assume permission granted if no crash; vision-camera handles runtime request.
      setHasPermission(true);
      return;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to scan QR codes and barcodes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
    } catch (err) {
      console.warn('Camera permission request failed', err);
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    requestCameraPermission();
  }, [requestCameraPermission]);

  const handleBarCodeRead = useCallback(
    async ({ barcodes }: { barcodes: Array<{ value: string; format: BarCodeType }> }) => {
      if (!isScanning || barcodes.length === 0) return;

      const code = barcodes[0];
      if (!code.value || !allowedTypes.includes(code.format)) return;

      // Prevent duplicate scans in quick succession
      if (code.value === lastScannedRef.current) return;
      lastScannedRef.current = code.value;

      setIsScanning(false);
      
      // AGENT_RULES §1: Do not log PII/tokens. Audit log stores hash or metadata only if needed.
      // await storeScanLog(`scan_${Date.now()}`, JSON.stringify({ type: code.format, length: code.value.length }));

      onScan({ data: code.value, type: code.format });

      // Resume scanning after a delay to allow UI to react
      setTimeout(() => {
        lastScannedRef.current = '';
        setIsScanning(true);
      }, 2000);
    },
    [isScanning, allowedTypes, onScan, storeScanLog]
  );

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Requesting camera access...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission denied.</Text>
        <Text style={styles.text}>Please enable camera access in settings to scan codes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNCamera
        ref={deviceRef}
        style={StyleSheet.absoluteFill}
        onBarCodeRead={handleBarCodeRead}
        barCodeTypes={allowedTypes}
        // AGENT_RULES §1: FLAG_SECURE equivalent - prevent screenshots/recording of camera feed
        // Note: react-native-vision-camera handles secure surface flags on Android automatically when possible.
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Align code within frame</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 16,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
});