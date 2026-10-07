// BottomTabBar.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Tab {
  label: string;
  icon?: React.ReactNode;
  value: string;
}

interface BottomTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (value: string) => void;
  activeColor?: string;
  inactiveColor?: string;
  indicatorColor?: string;
  style?: StyleProp<ViewStyle>;
  activeLabelStyle?: StyleProp<TextStyle>;
  inactiveLabelStyle?: StyleProp<TextStyle>;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  activeColor = '#007AFF',
  inactiveColor = '#8E8E93',
  indicatorColor = '#007AFF',
  style,
  activeLabelStyle,
  inactiveLabelStyle,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const tabsRef = useRef<View>(null);

  // Calculate the width of each tab segment
  const tabWidth = SCREEN_WIDTH / tabs.length;

  useEffect(() => {
    // Animate the indicator to the position of the active tab
    // We use a simple linear interpolation based on the index
    const index = tabs.findIndex((t) => t.value === activeTab);
    if (index !== -1) {
      Animated.timing(scrollX, {
        toValue: index * tabWidth,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [activeTab, tabs, tabWidth, scrollX]);

  // Calculate the transform translate X for the indicator
  const translateX = scrollX.interpolate({
    inputRange: tabs.map((_, i) => i * tabWidth),
    outputRange: tabs.map((_, i) => i * tabWidth),
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      {/* Sliding Indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [{ translateX }],
            width: tabWidth,
            backgroundColor: indicatorColor,
          },
        ]}
      />

      {/* Tabs Container */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.value;
          const color = isActive ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tabItem, { width: tabWidth }]}
              onPress={() => onTabPress(tab.value)}
              activeOpacity={0.7}
            >
              {/* Icon Placeholder */}
              {tab.icon && (
                <View style={styles.iconContainer}>
                  {tab.icon}
                </View>
              )}
              
              {/* Label */}
              <Text
                style={[
                  styles.tabLabel,
                  { color },
                  isActive && activeLabelStyle,
                  !isActive && inactiveLabelStyle,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 1.5,
  },
});

export default BottomTabBar;