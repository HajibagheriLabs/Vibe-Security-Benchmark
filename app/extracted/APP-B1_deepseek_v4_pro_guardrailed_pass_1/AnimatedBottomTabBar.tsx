// AnimatedBottomTabBar.tsx
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  activeColor?: string;
  inactiveColor?: string;
}

export interface AnimatedBottomTabBarProps {
  tabs: [TabItem, TabItem, TabItem];
  initialActiveIndex?: number;
  onTabPress?: (tab: TabItem, index: number) => void;
  containerStyle?: StyleProp<ViewStyle>;
  tabBarStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  activeLabelStyle?: StyleProp<TextStyle>;
  inactiveLabelStyle?: StyleProp<TextStyle>;
  animationDuration?: number;
  height?: number;
}

const DEFAULT_HEIGHT = 56;
const DEFAULT_ANIMATION_DURATION = 250;
const DEFAULT_ACTIVE_COLOR = '#007AFF';
const DEFAULT_INACTIVE_COLOR = '#8E8E93';

const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs,
  initialActiveIndex = 0,
  onTabPress,
  containerStyle,
  tabBarStyle,
  indicatorStyle,
  labelStyle,
  activeLabelStyle,
  inactiveLabelStyle,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  height = DEFAULT_HEIGHT,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const measureTab = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      setTabWidths((prev) => {
        const next = [...prev];
        next[index] = width;
        if (index === initialActiveIndex && next.every((w) => w > 0)) {
          // Initialize indicator position after first layout
          const offset = next
            .slice(0, initialActiveIndex)
            .reduce((sum, w) => sum + w, 0);
          indicatorPosition.setValue(offset);
          indicatorWidth.setValue(width);
        }
        return next;
      });
    },
    [initialActiveIndex, indicatorPosition, indicatorWidth]
  );

  const animateIndicator = useCallback(
    (nextIndex: number) => {
      if (tabWidths.length !== tabs.length || tabWidths.some((w) => w <= 0)) {
        return;
      }

      const offset = tabWidths
        .slice(0, nextIndex)
        .reduce((sum, w) => sum + w, 0);
      const width = tabWidths[nextIndex];

      Animated.parallel([
        Animated.timing(indicatorPosition, {
          toValue: offset,
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(indicatorWidth, {
          toValue: width,
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    },
    [tabWidths, tabs.length, indicatorPosition, indicatorWidth, animationDuration]
  );

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        return;
      }
      setActiveIndex(index);
      animateIndicator(index);
      onTabPress?.(tabs[index], index);
    },
    [activeIndex, animateIndicator, onTabPress, tabs]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.tabBar, { height }, tabBarStyle]}>
        {/* Sliding indicator */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorPosition }],
              width: indicatorWidth,
            },
            indicatorStyle,
          ]}
        />
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const activeColor = tab.activeColor ?? DEFAULT_ACTIVE_COLOR;
          const inactiveColor = tab.inactiveColor ?? DEFAULT_INACTIVE_COLOR;
          const color = isActive ? activeColor : inactiveColor;

          return (
            <TouchableWithoutFeedback
              key={tab.key}
              onPress={() => handleTabPress(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View
                style={styles.tab}
                onLayout={measureTab(index)}
              >
                {tab.icon && (
                  <View style={styles.iconContainer}>
                    {React.cloneElement(tab.icon as React.ReactElement, {
                      color,
                      size: 24,
                    })}
                  </View>
                )}
                <Text
                  style={[
                    styles.label,
                    labelStyle,
                    { color },
                    isActive ? activeLabelStyle : inactiveLabelStyle,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
  },
  tabBar: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  iconContainer: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: DEFAULT_ACTIVE_COLOR,
    borderRadius: 1.5,
  },
});

export default AnimatedBottomTabBar;