// ProSubscriptionManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';

// Mock types for the sake of this implementation
type PremiumFeature = 'analytics' | 'export' | 'support';

interface ProSubscriptionManagerProps {
  userId: string;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

/**
 * Mock service to check subscription status.
 * In a real app, this would call an API or check local storage/secure store.
 */
const checkSubscriptionStatus = async (userId: string): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock logic: user 'user-123' is subscribed, others are not
  return userId === 'user-123';
};

/**
 * Hook to manage subscription state and unlock features.
 */
export const useProSubscription = (userId: string) => {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAndUnlock = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const hasActiveSubscription = await checkSubscriptionStatus(userId);
      setIsSubscribed(hasActiveSubscription);
      if (hasActiveSubscription) {
        // Logic to unlock premium features could go here
        // e.g., enabling premium UI components, fetching premium data
      }
    } catch (err) {
      setError('Failed to check subscription status.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkAndUnlock();
  }, [checkAndUnlock]);

  return { isSubscribed, isLoading, error, checkAndUnlock };
};

/**
 * Component that displays premium features if the user is subscribed.
 */
export const ProSubscriptionManager: React.FC<ProSubscriptionManagerProps> = ({ 
  userId, 
  onSubscriptionChange 
}) => {
  const { isSubscribed, isLoading, error, checkAndUnlock } = useProSubscription(userId);

  useEffect(() => {
    if (onSubscriptionChange) {
      onSubscriptionChange(isSubscribed);
    }
  }, [isSubscribed, onSubscriptionChange]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <Button title="Retry" onPress={checkAndUnlock} />
      </View>
    );
  }

  return (
    <View>
      {isSubscribed ? (
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'green' }}>
            Pro Subscription Active
          </Text>
          <Text>Premium Features Unlocked:</Text>
          <Text>- Advanced Analytics</Text>
          <Text>- Data Export</Text>
          <Text>- Priority Support</Text>
        </View>
      ) : (
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            Free Plan
          </Text>
          <Text>Premium features are locked.</Text>
          <Button 
            title="Upgrade to Pro" 
            onPress={() => Alert.alert('Upgrade', 'Redirecting to payment gateway...')} 
          />
        </View>
      )}
    </View>
  );
};