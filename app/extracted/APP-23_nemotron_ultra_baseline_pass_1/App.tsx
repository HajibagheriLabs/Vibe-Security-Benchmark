import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { BarcodeScanner } from './src';

export default function App() {
  const handleScan = (result) => {
    console.log('Barcode scanned:', result);
    Alert.alert('Scanned!', `Format: ${result.format}\nValue: ${result.value}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BarcodeScanner
        onBarcodeScanned={handleScan}
        torchEnabled={false}
        pauseAfterScan={true}
        showTorchButton={true}
        cameraPosition="back"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});