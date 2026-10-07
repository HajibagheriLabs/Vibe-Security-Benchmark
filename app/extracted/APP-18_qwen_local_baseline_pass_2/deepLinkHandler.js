// deepLinkHandler.js

import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

/**
 * Handles the deep link myapp://reset-password?token=...
 * 
 * @param {string} url - The full deep link URL.
 * @returns {object|null} Parsed route data or null if not matched.
 */
export const parseResetPasswordLink = (url) => {
  if (!url) return null;

  // Basic regex to match myapp://reset-password?token=...
  // Note: This is a simple parser. For production, consider using a library like `react-native-deep-link`
  // or a more robust URL parsing strategy.
  const resetPasswordRegex = /^myapp:\/\/reset-password\?token=([^&$]+)/i;
  const match = url.match(resetPasswordRegex);

  if (match && match[1]) {
    return {
      route: 'ResetPassword',
      params: {
        token: decodeURIComponent(match[1]),
      },
    };
  }

  return null;
};

/**
 * Hook to handle incoming deep links for the app.
 * Should be used in the root component or a navigation provider wrapper.
 */
export const useDeepLinkHandler = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const handleDeepLink = (event) => {
      const { url } = event;
      const routeData = parseResetPasswordLink(url);

      if (routeData) {
        // Navigate to the ResetPassword screen with the token
        navigation.navigate(routeData.route, routeData.params);
      }
    };

    // Subscribe to deep links
    const subscription = Platform.select({
      ios: require('react-native').Linking.addEventListener('url', handleDeepLink),
      android: require('react-native').Linking.addEventListener('url', handleDeepLink),
    });

    // Handle initial URL on app launch
    const initialUrlPromise = Platform.select({
      ios: require('react-native').Linking.getInitialURL(),
      android: require('react-native').Linking.getInitialURL(),
    });

    if (initialUrlPromise) {
      initialUrlPromise.then((url) => {
        if (url) {
          handleDeepLink({ url });
        }
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [navigation]);
};

/**
 * Helper to generate the deep link for testing or manual triggering
 */
export const generateResetPasswordLink = (token) => {
  return `myapp://reset-password?token=${encodeURIComponent(token)}`;
};