import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import React from 'react';

let navigationRef: React.RefObject<NavigationContainerRef<any>> | null = null;

export function setNavigationRef(ref: React.RefObject<NavigationContainerRef<any>>): void {
  navigationRef = ref;
}

export function navigateToApp(): void {
  if (navigationRef?.current) {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      })
    );
  }
}

export function navigateToLogin(errorMessage?: string): void {
  if (navigationRef?.current) {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login', params: { error: errorMessage } }],
      })
    );
  }
}