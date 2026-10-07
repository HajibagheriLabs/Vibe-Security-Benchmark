import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, PermissionsAndroid, Platform, Alert } from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor, Frame } from 'react-native-vision-camera';
import { scanBarcodes } from 'react-native-vision-camera/frame-processor';

export type QRScannerProps = {
  onScan: (data: string) => void;
  torchEnabled?: boolean;
  paused?: boolean;
};

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  torchEnabled = false,
  paused = false,
}) => {
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices.back;
  const lastScanRef = useRef<string | null>(null);
  const scanCooldownRef = useRef(false);

  // Request camera permission on Android (iOS handled by Info.plist)
  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to scan QR codes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Camera access is required to scan QR codes.');
        }
      })();
    }
  }, []);

  const frameProcessor = useFrameProcessor((frame: Frame) => {
    if (paused || scanCooldownRef.current) return;

    const barcodes = scanBarcodes(frame, {
      formats: ['qr_code'],
    });

    if (barcodes.length > 0) {
      const raw = barcodes[0].rawValue;
      if (raw && raw !== lastScanRef.current) {
        lastScanRef.current = raw;
        scanCooldownRef.current = true;
        // Cooldown to prevent duplicate scans
        setTimeout(() => {
          scanCooldownRef.current = false;
          lastScanRef.current = null;
        }, 1500);
        // Callback on JS thread
        runOnJS(onScan)(raw);
      }
    }
  }, [paused]);

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.errorText}>No rear camera found</View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!paused}
        frameProcessor={frameProcessor}
        frameProcessorFps={15}
        torch={torchEnabled ? 'on' : 'off'}
        videoStabilizationMode="off"
      />
      <View style={styles.overlay} />
    </View>
  );
};

// Worklet bridge for frame processor -> JS thread
import { runOnJS } from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    margin: 40,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
});