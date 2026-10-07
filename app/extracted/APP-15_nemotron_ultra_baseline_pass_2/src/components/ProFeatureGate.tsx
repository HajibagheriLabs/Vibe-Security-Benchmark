import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useProSubscription } from '../hooks/useProSubscription';

interface ProFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProFeatureGate({ children, fallback }: ProFeatureGateProps) {
  const { isPro, isLoading, error } = useProSubscription();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Checking subscription…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unable to verify subscription: {error}</Text>
      </View>
    );
  }

  if (!isPro) {
    return fallback ?? (
      <View style={styles.center}>
        <Text style={styles.upgradeText}>Upgrade to Pro to unlock this feature</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#e00', textAlign: 'center' },
  upgradeText: { color: '#0066cc', fontWeight: '600' },
});