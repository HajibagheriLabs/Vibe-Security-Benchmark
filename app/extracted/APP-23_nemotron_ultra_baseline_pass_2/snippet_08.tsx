import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { QRScanner, ScannedBarcode } from './src/QRScanner';

export default function App() {
  const [lastScan, setLastScan] = useState<ScannedBarcode | null>(null);

  const handleScan = (barcode: ScannedBarcode) => {
    setLastScan(barcode);
    Alert.alert('Scanned!', `Format: ${barcode.format}\nData: ${barcode.data}`);
  };

  return (
    <View style={styles.container}>
      <QRScanner
        onScan={handleScan}
        pauseAfterScan={true}
        showTorchToggle={true}
        style={styles.scanner}
      />
      {lastScan && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Last Scan:</Text>
          <Text style={styles.resultData}>{lastScan.data}</Text>
          <Text style={styles.resultFormat}>Format: {lastScan.format}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scanner: { flex: 1 },
  resultBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  resultLabel: { color: '#00FF00', fontSize: 14, marginBottom: 4 },
  resultData: { color: '#fff', fontSize: 18, fontFamily: 'monospace' },
  resultFormat: { color: '#aaa', fontSize: 12, marginTop: 4 },
});