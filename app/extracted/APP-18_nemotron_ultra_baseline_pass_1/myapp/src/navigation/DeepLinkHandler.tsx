import { useEffect } from 'react';
import { Linking, URL } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  ResetPassword: { token: string };
  // other screens...
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DeepLinkHandler: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      const parsed = Linking.parse(url);
      const { hostname, queryParams } = parsed;

      if (hostname === 'reset-password') {
        const token = queryParams?.token as string | undefined;
        if (token) {
          navigation.navigate('ResetPassword', { token });
        }
      }
    };

    // Handle app launched from deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle app already running
    const subscription = Linking.addListener('url', ({ url }) => handleDeepLink(url));

    return () => subscription.remove();
  }, [navigation]);

  return null;
};