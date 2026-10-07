import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { DeepLinkHandler, RootStackParamList } from './DeepLinkHandler';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => (
  <NavigationContainer
    linking={{
      prefixes: ['myapp://'],
      config: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
    }}
  >
    <Stack.Navigator>
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
    <DeepLinkHandler />
  </NavigationContainer>
);