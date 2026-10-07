export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  selectedIcon?: React.ReactNode;
}

export interface BottomTabBarProps {
  tabs: readonly [TabItem, TabItem, TabItem];
  activeTab: string;
  onTabPress: (tabId: string) => void;
  style?: ReactNative.ViewStyle;
  indicatorColor?: string;
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
  height?: number;
  labelFontSize?: number;
  iconSize?: number;
}

import type { ViewStyle } from 'react-native';