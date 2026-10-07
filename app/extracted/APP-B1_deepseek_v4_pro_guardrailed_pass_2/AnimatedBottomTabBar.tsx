// AnimatedBottomTabBar.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  AccessibilityInfo,
  Platform,
} from 'react-native';

type TabKey = 'home' | 'search' | 'profile';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
}

interface AnimatedBottomTabBarProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}

const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'search', label: 'Search', icon: '⌕' },
  { key: 'profile', label: 'Profile', icon: '◉' },
];

const TAB_KEYS: TabKey[] = ['home', 'search', 'profile'];

const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  activeTab,
  onTabPress,
}) => {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<Record<TabKey, number>>({
    home: 0,
    search: 0,
    profile: 0,
  }).current;
  const containerWidth = useRef(0);

  const getIndicatorPosition = (tab: TabKey): number => {
    const widths = TAB_KEYS.slice(0, TAB_KEYS.indexOf(tab));
    const offset = widths.reduce((sum, key) => sum + tabWidths[key], 0);
    return offset;
  };

  const animateIndicator = (tab: TabKey) => {
    const position = getIndicatorPosition(tab);
    const width = tabWidths[tab];

    if (width <= 0 || containerWidth.current <= 0) {
      return;
    }

    Animated.spring(indicatorAnim, {
      toValue: position,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  useEffect(() => {
    animateIndicator(activeTab);
  }, [activeTab, containerWidth.current]);

  const handleTabLayout = (tab: TabKey) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (tabWidths[tab] !== width) {
      tabWidths[tab] = width;
      if (tab === activeTab) {
        animateIndicator(tab);
      }
    }
  };

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
    animateIndicator(activeTab);
  };

  const handleTabPress = (tab: TabKey) => {
    onTabPress(tab);
    AccessibilityInfo.announceForAccessibility(`${TABS.find(t => t.key === tab)?.label} tab selected`);
  };

  return (
    <View
      style={styles.container}
      onLayout={handleContainerLayout}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableWithoutFeedback
            key={tab.key}
            onPress={() => handleTabPress(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            testID={`tab-${tab.key}`}
          >
            <View
              style={styles.tabItem}
              onLayout={handleTabLayout(tab.key)}
            >
              <Text
                style={[
                  styles.icon,
                  isActive && styles.activeIcon,
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {tab.icon}
              </Text>
              <Text
                style={[
                  styles.label,
                  isActive && styles.activeLabel,
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        );
      })}

      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [{ translateX: indicatorAnim }],
            width: tabWidths[activeTab] || 0,
          },
        ]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 48,
  },
  icon: {
    fontSize: 22,
    color: '#757575',
    marginBottom: 4,
  },
  activeIcon: {
    color: '#1976D2',
  },
  label: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#1976D2',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 16 : 4,
    height: 3,
    backgroundColor: '#1976D2',
    borderRadius: 2,
    left: 0,
  },
});

export default AnimatedBottomTabBar;