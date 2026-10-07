import React from 'react';
import { AppNavigator } from './navigation/AppNavigator';
import { Providers } from './providers/Providers';

export default function App() {
  return (
    <Providers>
      <AppNavigator />
    </Providers>
  );
}