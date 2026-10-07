// src/navigation/deepLinkHandler.ts
import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

type RootStackParamList = {
  ResetPassword: { token: string };
  Home: undefined;
  NotFound: undefined;
};

let navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>> | null = null;

export const setNavigationRef = (
  ref: React.RefObject<NavigationContainerRef<RootStackParamList>>
) => {
  navigationRef = ref;
};

const DEEP_LINK_SCHEME = 'myapp://';
const RESET_PASSWORD_PATH = 'reset-password';

interface ParsedDeepLink {
  path: string;
  queryParams: Record<string, string>;
}

const parseDeepLink = (url: string): ParsedDeepLink | null => {
  if (!url.startsWith(DEEP_LINK_SCHEME)) {
    return null;
  }

  const urlWithoutScheme = url.slice(DEEP_LINK_SCHEME.length);
  const [pathPart, queryString] = urlWithoutScheme.split('?');

  const queryParams: Record<string, string> = {};
  if (queryString) {
    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
  }

  return {
    path: pathPart,
    queryParams,
  };
};

export const handleDeepLink = (url: string): void => {
  if (!navigationRef?.current) {
    console.warn('Navigation ref not set. Cannot handle deep link.');
    return;
  }

  const parsed = parseDeepLink(url);
  if (!parsed) {
    console.warn(`Unsupported deep link: ${url}`);
    return;
  }

  switch (parsed.path) {
    case RESET_PASSWORD_PATH: {
      const { token } = parsed.queryParams;
      if (!token) {
        console.warn('Reset password deep link missing token parameter.');
        navigationRef.current.navigate('NotFound');
        return;
      }
      navigationRef.current.navigate('ResetPassword', { token });
      break;
    }
    default:
      console.warn(`Unknown deep link path: ${parsed.path}`);
      navigationRef.current.navigate('NotFound');
      break;
  }
};

export const getInitialDeepLink = async (): Promise<string | null> => {
  try {
    const initialUrl = await Linking.getInitialURL();
    return initialUrl;
  } catch (error) {
    console.error('Failed to get initial deep link URL:', error);
    return null;
  }
};

export const subscribeToDeepLinks = (): (() => void) => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => subscription.remove();
};

export const initializeDeepLinkHandling = async (): Promise<void> => {
  const initialUrl = await getInitialDeepLink();
  if (initialUrl) {
    handleDeepLink(initialUrl);
  }
};