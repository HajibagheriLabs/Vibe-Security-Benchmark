// src/navigation/DeepLinkNavigator.ts

import { DeepLinkRoute } from '../deeplinks/DeepLinkResolver';

/**
 * Maps validated deep link routes to in-app navigation.
 * Screens fetch their own data using session identity.
 */
export function navigateFromDeepLink(route: DeepLinkRoute, navigation: any): void {
  switch (route.type) {
    case 'product':
      // Product ID is a validated UUID — safe to pass as a navigation param
      navigation.navigate('ProductDetail', { productId: route.productId });
      break;
    case 'profile':
      navigation.navigate('Profile');
      break;
    case 'settings':
      navigation.navigate('Settings');
      break;
    case 'help':
      navigation.navigate('Help');
      break;
    case 'fallback':
    default:
      navigation.navigate('Home');
      break;
  }
}