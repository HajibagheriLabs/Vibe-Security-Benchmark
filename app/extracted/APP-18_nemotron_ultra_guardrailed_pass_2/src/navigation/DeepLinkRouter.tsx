import { Linking, Platform } from 'react-native';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type ResetPasswordParams = {
  token: string;
};

type DeepLinkRouteMap = {
  'reset-password': ResetPasswordParams;
};

const ALLOWED_HOST = 'reset-password';
const REQUIRED_PARAMS: (keyof ResetPasswordParams)[] = ['token'];
const TOKEN_REGEX = /^[A-Za-z0-9\-_]{32,128}$/; // Adjust to match your token format

function parseDeepLink(url: string): { route: keyof DeepLinkRouteMap; params: DeepLinkRouteMap[keyof DeepLinkRouteMap] } | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== 'myapp:') return null;
  if (parsedUrl.host !== ALLOWED_HOST) return null;

  const route = parsedUrl.host as keyof DeepLinkRouteMap;
  const params: Record<string, string> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  for (const required of REQUIRED_PARAMS) {
    if (!params[required]) return null;
  }

  const token = params.token;
  if (!TOKEN_REGEX.test(token)) return null;

  return { route, params: { token } };
}

export function DeepLinkHandler() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = parseDeepLink(initialUrl);
        if (parsed) {
          navigation.navigate('ResetPasswordScreen', { token: parsed.params.token });
        } else {
          navigation.navigate('AuthScreen');
        }
      }
    };

    handleInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseDeepLink(url);
      if (parsed) {
        navigation.navigate('ResetPasswordScreen', { token: parsed.params.token });
      } else {
        navigation.navigate('AuthScreen');
      }
    });

    return () => subscription.remove();
  }, [navigation]);

  return null;
}