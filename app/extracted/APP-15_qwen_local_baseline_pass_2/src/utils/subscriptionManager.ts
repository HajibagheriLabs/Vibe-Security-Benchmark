// src/utils/subscriptionManager.ts

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface SubscriptionState {
  isPro: boolean;
  expiryDate?: string;
  subscriptionId?: string;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  requiredPlan: 'free' | 'pro';
}

// Mock database of premium features
const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'analytics_dashboard',
    name: 'Advanced Analytics',
    description: 'View detailed user behavior metrics.',
    requiredPlan: 'pro',
  },
  {
    id: 'export_data',
    name: 'Data Export',
    description: 'Export your data to CSV or PDF.',
    requiredPlan: 'pro',
  },
  {
    id: 'dark_mode',
    name: 'Dark Mode',
    description: 'Toggle between light and dark themes.',
    requiredPlan: 'free',
  },
];

/**
 * Checks if the user has an active Pro subscription.
 * In a real app, this would likely call a backend API or parse a JWT token.
 * Here, we simulate checking local storage or a mock API.
 */
export async function checkActiveSubscription(): Promise<boolean> {
  try {
    // Simulate fetching subscription status from backend or local storage
    // For demonstration, we assume a static check or async storage retrieval
    const storedSubscription = await AsyncStorage.getItem('user_subscription');
    
    if (!storedSubscription) {
      return false;
    }

    const subscription: SubscriptionState = JSON.parse(storedSubscription);
    
    // Check if pro and not expired
    if (subscription.isPro && subscription.expiryDate) {
      const expiry = new Date(subscription.expiryDate);
      const now = new Date();
      return expiry > now;
    }

    return subscription.isPro;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

/**
 * Unlocks premium features based on subscription status.
 * Returns a list of available features.
 */
export async function unlockPremiumFeatures(): Promise<PremiumFeature[]> {
  const isPro = await checkActiveSubscription();
  
  // Filter features: show all if free, but only pro features if pro
  // Or, typically: show all features, but disable/lock pro ones for free users
  const availableFeatures = PREMIUM_FEATURES.filter(feature => {
    if (feature.requiredPlan === 'free') {
      return true;
    }
    return isPro;
  });

  return availableFeatures;
}

/**
 * Helper to check if a specific feature is unlocked
 */
export async function isFeatureUnlocked(featureId: string): Promise<boolean> {
  const isPro = await checkActiveSubscription();
  const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
  
  if (!feature) return false;
  
  if (feature.requiredPlan === 'free') {
    return true;
  }
  
  return isPro;
}

/**
 * Triggers a purchase flow if the user tries to access a pro feature without subscription
 */
export async function handleFeatureAccess(feature: PremiumFeature): Promise<boolean> {
  const isUnlocked = await isFeatureUnlocked(feature.id);
  
  if (isUnlocked) {
    return true;
  }
  
  if (feature.requiredPlan === 'pro') {
    Alert.alert(
      'Pro Feature Unlocked',
      `This feature requires a Pro subscription. Would you like to upgrade?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => console.log('Initiating purchase flow for:', feature.id) },
      ]
    );
    return false;
  }
  
  return false;
}