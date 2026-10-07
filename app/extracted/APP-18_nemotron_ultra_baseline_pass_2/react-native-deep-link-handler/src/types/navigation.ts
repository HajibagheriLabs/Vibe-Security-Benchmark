export type RootStackParamList = {
  ResetPassword: { token: string };
  Login: undefined;
  Home: undefined;
  // Add other routes as needed
};

export type DeepLinkRoute = keyof RootStackParamList;