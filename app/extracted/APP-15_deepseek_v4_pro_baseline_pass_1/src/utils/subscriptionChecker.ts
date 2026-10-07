import Purchases, { CustomerInfo } from 'react-native-purchases';

const PRO_ENTITLEMENT_ID = 'pro_subscription';

/**
 * Standalone function to check if a user has an active Pro subscription.
 * Returns a boolean indicating Pro status.
 * 
 * @param customerInfo - Optional pre-fetched customer info (avoids duplicate API calls)
 * @returns Promise<boolean> - True if user has active Pro subscription
 */
export async function hasActiveProSubscription(
  customerInfo?: CustomerInfo
): Promise<boolean> {
  try {
    // Use provided customer info or fetch fresh data
    const info = customerInfo ?? (await Purchases.getCustomerInfo());

    const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
    
    // Check if entitlement exists and is active
    return entitlement !== undefined && entitlement.isActive;
  } catch (error) {
    console.error('[subscriptionChecker] Error checking Pro subscription:', error);
    return false;
  }
}

/**
 * Checks subscription status and returns detailed information.
 * Useful for analytics, feature flagging, and debugging.
 */
export async function getSubscriptionDetails(customerInfo?: CustomerInfo): Promise<{
  isPro: boolean;
  entitlementId: string | null;
  expirationDate: string | null;
  productId: string | null;
  isSandbox: boolean;
}> {
  try {
    const info = customerInfo ?? (await Purchases.getCustomerInfo());
    const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];

    return {
      isPro: entitlement !== undefined && entitlement.isActive,
      entitlementId: entitlement?.identifier ?? null,
      expirationDate: entitlement?.expirationDate ?? null,
      productId: entitlement?.productIdentifier ?? null,
      isSandbox: info.entitlements.verification === 'NOT_REQUESTED',
    };
  } catch (error) {
    console.error('[subscriptionChecker] Error getting subscription details:', error);
    return {
      isPro: false,
      entitlementId: null,
      expirationDate: null,
      productId: null,
      isSandbox: false,
    };
  }
}