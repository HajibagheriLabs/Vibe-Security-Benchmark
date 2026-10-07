import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

type ResetPasswordParams = {
  token: string;
};

type DeepLinkRoute =
  | { name: 'ResetPassword'; params: ResetPasswordParams }
  | null;

const SCHEME = 'myapp';
const RESET_PASSWORD_HOST = 'reset-password';

export const parseResetPasswordUrl = (url: string): DeepLinkRoute => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const match = url.match(/^myapp:\/\/reset-password\?token=([^&]+)/);
  if (!match) {
    return null;
  }

  const token = decodeURIComponent(match[1]);
  if (!token) {
    return null;
  }

  return {
    name: 'ResetPassword',
    params: { token },
  };
};

export const handleDeepLink = (
  url: string,
  navigationRef: React.RefObject<NavigationContainerRef<any>>,
): boolean => {
  const route = parseResetPasswordUrl(url);

  if (!route) {
    console.warn(`[DeepLink] Unrecognized or malformed URL: ${url}`);
    return false;
  }

  if (!navigationRef.current?.isReady()) {
    console.warn('[DeepLink] Navigation container is not ready yet.');
    return false;
  }

  navigationRef.current.navigate(route.name, route.params);
  return true;
};

export const subscribeToDeepLinks = (
  navigationRef: React.RefObject<NavigationContainerRef<any>>,
): (() => void) => {
  const handleUrl = (event: { url: string }) => {
    handleDeepLink(event.url, navigationRef);
  };

  const subscription = Linking.addEventListener('url', handleUrl);

  // Handle initial URL (cold start)
  Linking.getInitialURL()
    .then((url) => {
      if (url) {
        handleDeepLink(url, navigationRef);
      }
    })
    .catch((error) => {
      console.error('[DeepLink] Failed to get initial URL:', error);
    });

  return () => subscription.remove();
};