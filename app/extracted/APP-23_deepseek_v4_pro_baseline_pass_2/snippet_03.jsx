import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRScanner from './QRScanner';

const App = () => {
  const handleScan = (data, barcode) => {
    console.log('Scanned data:', data);
    console.log('Barcode details:', barcode);
    // Handle the scanned data (e.g., navigate, save, validate)
  };

  const handleClose = () => {
    console.log('Scanner closed');
    // Navigate back or hide scanner
  };

  return (
    <View style={styles.container}>
      <QRScanner
        onScan={handleScan}
        onClose={handleClose}
        showTorchButton={true}
        vibrateOnScan={true}
        scanInterval={1500}
        frameColor="#00FF88"
        frameSize={280}
        title="Scan Barcode"
        subtitle="Point camera at QR or barcode"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;