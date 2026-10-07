import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useProSubscription } from '../hooks/useProSubscription';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradePress?: () => void;
}

/**
 * Wrapper component that conditionally renders premium content based on Pro subscription status.
 */
export function PremiumFeatureGate({
  children,
  fallback,
  onUpgradePress,
}: PremiumFeatureGateProps): JSX.Element {
  const { isPro, isLoading, error } = useProSubscription();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Checking subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to verify subscription</Text>
        <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
      </View>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.description}>
        Upgrade to Pro to unlock this feature and many more!
      </Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={onUpgradePress}
        accessibilityRole="button"
        accessibilityLabel="Upgrade to Pro"
      >
        <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC3545',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});