import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useProSubscription, getPremiumFeatures } from '../hooks/useProSubscription';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradePress?: () => void;
  loadingComponent?: React.ReactNode;
}

/**
 * Wrapper component that conditionally renders children based on Pro subscription status.
 * Shows a paywall or custom fallback when the user is not subscribed.
 */
export const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  fallback,
  onUpgradePress,
  loadingComponent,
}) => {
  const { isPro, isLoading, error, restorePurchases } = useProSubscription();

  if (isLoading) {
    return (
      <View style={styles.container}>
        {loadingComponent || (
          <ActivityIndicator size="large" color="#007AFF" />
        )}
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
      <View style={styles.paywallCard}>
        <Text style={styles.title}>Unlock Premium Features</Text>
        <Text style={styles.description}>
          Subscribe to Pro to access exclusive content, advanced tools, and more.
        </Text>
        {error && <Text style={styles.error}>Error: {error}</Text>}
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={onUpgradePress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro"
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restorePurchases}
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
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
  paywallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});