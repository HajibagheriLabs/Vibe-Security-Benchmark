import React, { useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import QRScanner from './QRScanner';

const App = () => {
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const handleScan = (result) => {
    console.log('Scanned:', result);
    setScannedData(result.value);
    setIsScannerVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.resultText}>
        {scannedData ? `Scanned: ${scannedData}` : 'No scan yet'}
      </Text>
      <Button
        title="Open Scanner"
        onPress={() => setIsScannerVisible(true)}
      />
      <QRScanner
        visible={isScannerVisible}
        onScan={handleScan}
        onClose={() => setIsScannerVisible(false)}
        vibrateOnScan={true}
        scanDelay={1500}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default App;