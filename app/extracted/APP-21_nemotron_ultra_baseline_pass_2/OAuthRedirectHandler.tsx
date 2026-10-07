import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { AuthService } from '../services/AuthService';
import { TokenStorage } from '../utils/TokenStorage';
import { Logger } from '../utils/Logger';

type OAuthRedirectHandlerNavigationProp = NavigationProp<RootStackParamList, 'OAuthRedirect'>;

interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export const OAuthRedirectHandler: React.FC = () => {
  const navigation = useNavigation<OAuthRedirectHandlerNavigationProp>();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const params = parseCallbackUrl(url);
        await processAuthCallback(params);
      } catch (error) {
        Logger.error('OAuth callback handling failed', error);
        setErrorMessage('Authentication failed. Please try again.');
        setIsProcessing(false);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const parseCallbackUrl = (url: string): OAuthCallbackParams => {
    const urlObj = new URL(url);
    const params: OAuthCallbackParams = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key as keyof OAuthCallbackParams] = value;
    });

    return params;
  };

  const processAuthCallback = async (params: OAuthCallbackParams) => {
    if (params.error) {
      const errorMsg = params.error_description || params.error;
      Logger.warn('OAuth error received', { error: params.error, description: params.error_description });
      setErrorMessage(`Authentication failed: ${errorMsg}`);
      setIsProcessing(false);
      return;
    }

    if (!params.code) {
      setErrorMessage('No authorization code received. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (!params.state) {
      Logger.warn('OAuth callback missing state parameter');
    }

    try {
      const tokenResponse = await AuthService.exchangeCodeForTokens(params.code);
      
      await TokenStorage.storeTokens({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        idToken: tokenResponse.id_token,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
      });

      const userProfile = await AuthService.fetchUserProfile(tokenResponse.access_token);
      await TokenStorage.storeUserProfile(userProfile);

      Logger.info('OAuth authentication successful', { userId: userProfile.id });
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs' }],
      });
    } catch (error) {
      Logger.error('Token exchange or profile fetch failed', error);
      
      if (error instanceof AuthService.TokenExchangeError) {
        setErrorMessage(`Authentication failed: ${error.message}`);
      } else if (error instanceof AuthService.NetworkError) {
        setErrorMessage('Network error. Please check your connection and try again.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setIsProcessing(true);
    navigation.goBack();
  };

  if (isProcessing && !errorMessage) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Completing sign in...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Text style={styles.retryText} onPress={handleRetry}>
          Tap to try again
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  retryText: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});