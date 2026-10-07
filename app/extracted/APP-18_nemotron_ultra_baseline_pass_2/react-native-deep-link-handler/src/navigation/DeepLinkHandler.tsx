import { Linking, Platform, NativeModules } from 'react-native';
import { useEffect, useCallback } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export interface ResetPasswordDeepLinkParams {
  token: string;
}

export interface ParsedDeepLink {
  route: 'ResetPassword';
  params: ResetPasswordDeepLinkParams;
}

const DEEP_LINK_SCHEME = 'myapp';
const RESET_PASSWORD_PATH = 'reset-password';

export function parseResetPasswordDeepLink(url: string): ParsedDeepLink | null {
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.protocol !== `${DEEP_LINK_SCHEME}:`) {
      return null;
    }
    
    if (parsedUrl.host !== RESET_PASSWORD_PATH && parsedUrl.pathname !== `/${RESET_PASSWORD_PATH}`) {
      return null;
    }
    
    const token = parsedUrl.searchParams.get('token');
    
    if (!token || token.trim() === '') {
      return null;
    }
    
    return {
      route: 'ResetPassword',
      params: { token: token.trim() },
    };
  } catch {
    return null;
  }
}

export function useDeepLinkHandler(
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>
): void {
  const handleDeepLink = useCallback(
    (url: string) => {
      const parsedLink = parseResetPasswordDeepLink(url);
      
      if (!parsedLink) {
        console.warn('[DeepLinkHandler] Invalid or unhandled deep link:', url);
        return;
      }
      
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate(parsedLink.route, parsedLink.params);
      } else {
        console.warn('[DeepLinkHandler] Navigation not ready, queuing deep link');
      }
    },
    [navigationRef]
  );

  useEffect(() => {
    const handleInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('[DeepLinkHandler] Failed to get initial URL:', error);
      }
    };

    handleInitialUrl();

    const subscription = Linking.addListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);
}

export function buildResetPasswordDeepLink(token: string): string {
  if (!token || token.trim() === '') {
    throw new Error('Token is required to build reset password deep link');
  }
  
  const encodedToken = encodeURIComponent(token.trim());
  return `${DEEP_LINK_SCHEME}://${RESET_PASSWORD_PATH}?token=${encodedToken}`;
}

export function validateResetPasswordToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const trimmedToken = token.trim();
  
  if (trimmedToken.length < 32 || trimmedToken.length > 512) {
    return false;
  }
  
  return /^[A-Za-z0-9\-_=]+$/.test(trimmedToken);
}