import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Easing,
} from 'react-native';

interface TabItem {
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

interface AnimatedBottomTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onPress: (index: number) => void;
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
  indicatorColor?: string;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 3;

const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs,
  activeIndex,
  onPress,
  activeColor = '#007AFF',
  inactiveColor = '#8E8E93',
  backgroundColor = '#FFFFFF',
  indicatorColor = '#007AFF',
  height = 80,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const indicatorStyle = useMemo(() => ({
    transform: [{ translateX }],
    width: TAB_WIDTH,
  }), [translateX]);

  const animateToTab = (index: number) => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: index * TAB_WIDTH,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  React.useEffect(() => {
    animateToTab(activeIndex);
  }, [activeIndex]);

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.indicator,
            indicatorStyle,
            { backgroundColor: indicatorColor },
          ]}
        />
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => onPress(index)}
            activeOpacity={1}
          >
            <Animated.View
              style={{
                transform: [{ scale: index === activeIndex ? scaleAnim : 1 }],
              }}
            >
              {index === activeIndex && tab.activeIcon ? (
                tab.activeIcon
              ) : (
                tab.icon
              )}
            </Animated.View>
            <Animated.Text
              style={[
                styles.label,
                {
                  color: index === activeIndex ? activeColor : inactiveColor,
                },
              ]}
            >
              {tab.label}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.shadow} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    overflow: 'hidden',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'System',
  },
  shadow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default AnimatedBottomTabBar;