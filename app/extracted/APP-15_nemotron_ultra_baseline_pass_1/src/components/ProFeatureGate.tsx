import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Button } from 'react-native';
import { useProSubscription } from '../hooks/useProSubscription';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  SubscriptionScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SubscriptionScreen'>;

interface ProFeatureGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  requirePro?: boolean;
}

export function ProFeatureGate({
  children,
  fallback,
  requirePro = true,
}: ProFeatureGateProps) {
  const { isActive, isLoading, error, refresh } = useProSubscription();
  const navigation = useNavigation<NavigationProp>();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to verify subscription status</Text>
        <Button title="Retry" onPress={refresh} />
      </View>
    );
  }

  if (requirePro && !isActive) {
    return (
      fallback || (
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedTitle}>Pro Feature</Text>
          <Text style={styles.lockedText}>
            This feature requires an active Pro subscription.
          </Text>
          <Button
            title="Upgrade to Pro"
            onPress={() => navigation.navigate('SubscriptionScreen')}
            color="#007AFF"
          />
        </View>
      )
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    margin: 16,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});