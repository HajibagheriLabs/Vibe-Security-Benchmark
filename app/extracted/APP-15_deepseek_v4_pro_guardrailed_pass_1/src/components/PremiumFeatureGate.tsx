// src/components/PremiumFeatureGate.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useProSubscription } from '../hooks/useProSubscription';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradePress?: () => void;
}

/**
 * Component that gates premium features behind Pro subscription.
 * Security note: UI gating is UX only; actual feature access must be enforced server-side.
 */
export function PremiumFeatureGate({ 
  children, 
  fallback, 
  onUpgradePress 
}: PremiumFeatureGateProps) {
  const { isPro, isLoading } = useProSubscription();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isPro) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.description}>
          Upgrade to Pro to access this feature.
        </Text>
        {onUpgradePress && (
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});