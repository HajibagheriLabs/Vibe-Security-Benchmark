import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';

interface TabItem {
  key: string;
  label: string;
  icon: string;
}

interface AnimatedBottomTabBarProps {
  tabs?: TabItem[];
  activeTab?: string;
  onTabPress?: (key: string) => void;
  indicatorColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  backgroundColor?: string;
  height?: number;
}

const DEFAULT_TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'search', label: 'Search', icon: '🔍' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs = DEFAULT_TABS,
  activeTab = DEFAULT_TABS[0].key,
  onTabPress,
  indicatorColor = '#007AFF',
  activeTextColor = '#007AFF',
  inactiveTextColor = '#8E8E93',
  backgroundColor = '#FFFFFF',
  height = 60,
}) => {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<number[]>([]);
  const containerWidth = useRef(0);
  const [currentTab, setCurrentTab] = React.useState(activeTab);

  const getActiveIndex = (): number => {
    const index = tabs.findIndex((tab) => tab.key === currentTab);
    return index >= 0 ? index : 0;
  };

  const animateIndicator = (index: number) => {
    const tabWidth = tabWidths.current[index] || 0;
    const offset = tabWidths.current
      .slice(0, index)
      .reduce((sum, width) => sum + width, 0);

    Animated.spring(indicatorAnim, {
      toValue: offset,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    }).start();
  };

  const handleTabPress = (key: string, index: number) => {
    setCurrentTab(key);
    animateIndicator(index);
    onTabPress?.(key);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
    const width = containerWidth.current / tabs.length;
    tabWidths.current = tabs.map(() => width);

    // Initialize indicator position
    const activeIndex = getActiveIndex();
    const offset = tabWidths.current
      .slice(0, activeIndex)
      .reduce((sum, w) => sum + w, 0);
    indicatorAnim.setValue(offset);
  };

  const indicatorWidth = tabWidths.current[getActiveIndex()] || 
    (containerWidth.current > 0 ? containerWidth.current / tabs.length : 0);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          height,
          borderTopColor: '#E5E5EA',
        },
      ]}
      onLayout={handleLayout}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: indicatorColor,
            width: indicatorWidth,
            transform: [{ translateX: indicatorAnim }],
          },
        ]}
      />
      {tabs.map((tab, index) => {
        const isActive = tab.key === currentTab;
        return (
          <TouchableWithoutFeedback
            key={tab.key}
            onPress={() => handleTabPress(tab.key, index)}
          >
            <View style={styles.tabItem}>
              <Text style={[styles.icon, { fontSize: 22 }]}>{tab.icon}</Text>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? activeTextColor : inactiveTextColor,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 1.5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
  },
});

export default AnimatedBottomTabBar;