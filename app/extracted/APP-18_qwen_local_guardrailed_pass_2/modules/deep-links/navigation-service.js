import { CommonActions, StackActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

// Rule 4: Redirects resolve through a destination map.
// This is a simplified wrapper for the example.

export function navigateTo(routeName, params = {}) {
  // In a real app, this would use the navigation ref or context.
  // For this isolated implementation, we assume a global navigation ref or hook.
  const navigation = useNavigation(); // Note: In a non-component context, use a ref
  
  // Rule 4: No coercion, no defaults.
  // We push the screen onto the stack.
  navigation.navigate(routeName, params);
}

// For use in non-component contexts (like the deep link handler)
let navigationRef;

export function setNavigationRef(ref) {
  navigationRef = ref;
}

export function navigateToScreen(routeName, params = {}) {
  if (navigationRef && navigationRef.isReady()) {
    navigationRef.navigate(routeName, params);
  } else {
    console.warn('[Navigation] Navigation ref not ready, ignoring deep link.');
  }
}