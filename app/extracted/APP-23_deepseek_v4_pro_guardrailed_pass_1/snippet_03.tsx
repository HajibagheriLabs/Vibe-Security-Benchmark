import React, { useCallback } from 'react';
import { Alert, View } from 'react-native';
import QRScanner from './QRScanner';

const App: React.FC = () => {
  const handleScan = useCallback((value: string) => {
    // Security: validate scanned content before using it
    // This is where you would implement your URL allowlist validation
    // Never navigate or mutate state directly from scanned input
    Alert.alert('Scanned', `Value: ${value}`);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Scanner error:', error.message);
  }, []);

  const handlePermissionDenied = useCallback(() => {
    Alert.alert(
      'Permission Required',
      'Camera access is needed to scan QR codes.'
    );
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <QRScanner
        onScan={handleScan}
        onError={handleError}
        onPermissionDenied={handlePermissionDenied}
        active={true}
      />
    </View>
  );
};

export default App;