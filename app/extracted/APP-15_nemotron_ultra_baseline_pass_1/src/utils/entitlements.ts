import { CustomerInfo } from 'react-native-purchases';

export const ENTITLEMENTS = {
  PRO_FEATURES: 'pro_features',
  CLOUD_SYNC: 'cloud_sync',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  UNLIMITED_PROJECTS: 'unlimited_projects',
} as const;

export type EntitlementId = typeof ENTITLEMENTS[keyof typeof ENTITLEMENTS];

export function hasActiveEntitlement(
  customerInfo: CustomerInfo | null,
  entitlementId: EntitlementId
): boolean {
  if (!customerInfo) return false;
  
  const entitlement = customerInfo.entitlements.active[entitlementId];
  return !!entitlement && !entitlement.isSandbox;
}

export function getAllActiveEntitlements(customerInfo: CustomerInfo | null): EntitlementId[] {
  if (!customerInfo) return [];
  
  return Object.entries(customerInfo.entitlements.active)
    .filter(([, entitlement]) => entitlement && !entitlement.isSandbox)
    .map(([id]) => id as EntitlementId);
}

export function isProUser(customerInfo: CustomerInfo | null): boolean {
  return hasActiveEntitlement(customerInfo, ENTITLEMENTS.PRO_FEATURES);
}

export function getEntitlementExpirationDate(
  customerInfo: CustomerInfo | null,
  entitlementId: EntitlementId
): Date | null {
  if (!customerInfo) return null;
  
  const entitlement = customerInfo.entitlements.active[entitlementId];
  if (!entitlement || entitlement.isSandbox) return null;
  
  return entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
}

export function getSubscriptionStatus(customerInfo: CustomerInfo | null): {
  isActive: boolean;
  isSandbox: boolean;
  expirationDate: Date | null;
  willRenew: boolean;
  store: 'app_store' | 'play_store' | 'unknown';
} {
  const proEntitlement = customerInfo?.entitlements.active[ENTITLEMENTS.PRO_FEATURES];
  
  if (!proEntitlement) {
    return {
      isActive: false,
      isSandbox: false,
      expirationDate: null,
      willRenew: false,
      store: 'unknown',
    };
  }

  return {
    isActive: !proEntitlement.isSandbox,
    isSandbox: proEntitlement.isSandbox,
    expirationDate: proEntitlement.expirationDate ? new Date(proEntitlement.expirationDate) : null,
    willRenew: proEntitlement.willRenew,
    store: proEntitlement.store === 'app_store' ? 'app_store' : 
           proEntitlement.store === 'play_store' ? 'play_store' : 'unknown',
  };
}