import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useProSubscription } from '../hooks/useProSubscription';

// Rule 4: Deep links/URLs never authorize. This screen fetches its own data.
// Rule 1: No sensitive values logged or screenshot-tagged.
// Rule 3: Price/entitlement computed server-side. We only display what the server says.

export const PremiumFeature: React.FC = () => {
  const { isActive, isLoading, error, refresh } = useProSubscription();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error: {error}</Text>
        <Text onPress={refresh}>Retry</Text>
      </View>
    );
  }

  if (!isActive) {
    return (
      <View style={styles.container}>
        <Text>Premium features are locked.</Text>
        <Text onPress={refresh}>Check Status</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.premiumText}>
        Welcome, Pro Member! You have access to all premium features.
      </Text>
      {/* Example: Render premium-specific UI here */}
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
  premiumText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});