import Purchases, { PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';
import { Platform } from 'react-native';
import { checkProSubscriptionStatus } from '../hooks/useProSubscription';

/**
 * Manages Pro subscription lifecycle including purchasing, upgrading,
 * and downgrading subscription tiers.
 */
export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private offerings: PurchasesOfferings | null = null;

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  /**
   * Fetch available subscription packages from RevenueCat.
   */
  async fetchOfferings(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await Purchases.getOfferings();
      this.offerings = offerings;
      return offerings.current?.availablePackages ?? [];
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
      return [];
    }
  }

  /**
   * Purchase a Pro subscription package.
   */
  async purchaseProSubscription(packageToPurchase: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return typeof customerInfo.entitlements.active['pro_subscription'] !== 'undefined';
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
        return false;
      }
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has an active Pro subscription.
   */
  async hasActiveProSubscription(): Promise<boolean> {
    return checkProSubscriptionStatus();
  }

  /**
   * Get the current subscription tier (Pro, Premium, etc.).
   */
  async getCurrentSubscriptionTier(): Promise<string | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      
      if (activeEntitlements.includes('pro_subscription')) {
        return 'pro';
      }
      if (activeEntitlements.includes('premium_subscription')) {
        return 'premium';
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is eligible for a trial or introductory offer.
   */
  async checkTrialEligibility(packageToCheck: PurchasesPackage): Promise<boolean> {
    try {
      const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([
        packageToCheck.identifier,
      ]);
      return eligibility[packageToCheck.identifier]?.status === 'eligible';
    } catch {
      return false;
    }
  }

  /**
   * Get the expiry date of the current subscription.
   */
  async getSubscriptionExpiryDate(): Promise<Date | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const proEntitlement = customerInfo.entitlements.active['pro_subscription'];
      
      if (proEntitlement?.expirationDate) {
        return new Date(proEntitlement.expirationDate);
      }
      return null;
    } catch {
      return null;
    }
  }
}