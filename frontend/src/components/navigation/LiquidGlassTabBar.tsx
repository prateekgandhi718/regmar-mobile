import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/providers/theme-provider";

type TabMeta = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const TAB_META: Record<string, TabMeta> = {
  Home: { label: "Home", icon: "home" },
  Txns: { label: "Txns", icon: "repeat" },
  Investments: { label: "Investments", icon: "trending-up" },
  Accounts: { label: "Accounts", icon: "credit-card" },
  Settings: { label: "Settings", icon: "settings" },
};

export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [reduceTransparencyEnabled, setReduceTransparencyEnabled] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);

  const indicatorX = useSharedValue(0);
  const indicatorPulse = useSharedValue(0);
  const glowPhase = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparencyEnabled).catch(() => {
      setReduceTransparencyEnabled(false);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparencyEnabled);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    glowPhase.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glowPhase]);

  const shouldUseNativeLiquidGlass = useMemo(
    () => Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable() && !reduceTransparencyEnabled,
    [reduceTransparencyEnabled],
  );

  const tabCount = state.routes.length;
  const tabWidth = tabCount > 0 ? rowWidth / tabCount : 0;

  useEffect(() => {
    if (!tabWidth) {
      return;
    }

    indicatorX.value = withSpring(state.index * tabWidth, {
      damping: 20,
      stiffness: 240,
      mass: 0.75,
      overshootClamping: false,
    });

    indicatorPulse.value = 0;
    indicatorPulse.value = withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 220 }));
  }, [indicatorPulse, indicatorX, state.index, tabWidth]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const scaleX = interpolate(indicatorPulse.value, [0, 1], [1, 1.08]);
    const scaleY = interpolate(indicatorPulse.value, [0, 1], [1, 0.96]);

    return {
      transform: [{ translateX: indicatorX.value }, { scaleX }, { scaleY }],
    };
  });

  const iconColor = isDark ? "#d4d4d8" : "#52525b";
  const labelColor = isDark ? "#d4d4d8" : "#52525b";
  const activeColor = isDark ? "#fafafa" : "#18181b";
  const colorScheme = isDark ? "dark" : "light";

  const onRowLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - rowWidth) > 0.5) {
      setRowWidth(nextWidth);
    }
  };

  const indicator = tabWidth > 0 ? (
    <Animated.View pointerEvents="none" style={[styles.indicatorSlot, { width: tabWidth }, indicatorAnimatedStyle]}>
      {shouldUseNativeLiquidGlass ? (
        <GlassView
          style={styles.activeGlassPill}
          glassEffectStyle={{ style: "clear", animate: true, animationDuration: 0.22 }}
          colorScheme={colorScheme}
          isInteractive
        />
      ) : (
        <View style={[styles.activeFallbackPill, isDark ? styles.activeTabDark : styles.activeTabLight]} />
      )}
    </Animated.View>
  ) : null;

  const tabContent = (
    <View style={styles.row} onLayout={onRowLayout}>
      {indicator}
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const meta = TAB_META[route.name] ?? { label: route.name, icon: "circle" };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const { options } = descriptors[route.key];

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            key={route.key}
            style={styles.tab}
          >
            <Feather name={meta.icon} size={18} color={isFocused ? activeColor : iconColor} />
            <Text style={[styles.label, { color: isFocused ? activeColor : labelColor }]} numberOfLines={1}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const shellBody = tabContent;

  if (shouldUseNativeLiquidGlass) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom - 18, 0) }]}>
        <GlassContainer spacing={8} style={styles.shellContainer}>
          <GlassView style={styles.shell} glassEffectStyle="regular" colorScheme={colorScheme} isInteractive />
          <View style={styles.overlayRow}>{shellBody}</View>
        </GlassContainer>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 2, 12) }]}>
      <View style={[styles.shell, isDark ? styles.shellDark : styles.shellLight]}>{shellBody}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 0,
  },
  shell: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    minHeight: 68,
  },
  shellContainer: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 68,
    justifyContent: "center",
  },
  overlayRow: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
  },
  shellLight: {
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.72)",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 9,
  },
  shellDark: {
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(39,39,42,0.7)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 20,
    elevation: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 68,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  indicatorSlot: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    paddingHorizontal: 2,
  },
  activeGlassPill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  activeFallbackPill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  tab: {
    flex: 1,
    zIndex: 2,
    minHeight: 56,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 4,
  },
  activeTabLight: {
    backgroundColor: "rgba(255,255,255,0.36)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
  },
  activeTabDark: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
});
