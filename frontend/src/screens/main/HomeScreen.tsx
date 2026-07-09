import { useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";
import { EditTransactionDrawer } from "@/components/transactions/EditTransactionDrawer";
import { useTiltPress } from "@/hooks/use-tilt-press";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetTransactionsQuery } from "@/redux/api/transactionsApi";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const ARC_TAIL_ANGLE = 320;
const ARC_SWEEP = 286;
const ARC_SEGMENTS = 140;

const polarToCartesian = (center: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

const createShortArcPath = (center: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(center, radius, startAngle);
  const end = polarToCartesian(center, radius, endAngle);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 0 ${end.x} ${end.y}`;
};

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: transactions = [] } = useGetTransactionsQuery();
  const { width } = useWindowDimensions();
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const plusPress = useTiltPress({ pressedScale: 0.93, tiltDegrees: 0.8, perspective: 900 });
  const ringSize = Math.max(260, Math.min(340, width - 36));
  const ringStrokeWidth = Math.max(20, Math.min(32, Math.round(ringSize * 0.09)));
  const ringRadius = (ringSize - ringStrokeWidth) / 2;
  const titleFontSize = Math.max(36, Math.min(56, Math.round(width * 0.12)));
  const titleLineHeight = titleFontSize + 6;
  const arcGeometry = useMemo(() => {
    const center = ringSize / 2;

    const segments = Array.from({ length: ARC_SEGMENTS }, (_, index) => {
      const t0 = index / ARC_SEGMENTS;
      const t1 = (index + 1) / ARC_SEGMENTS;
      const startAngle = ARC_TAIL_ANGLE - ARC_SWEEP * t0;
      const endAngle = ARC_TAIL_ANGLE - ARC_SWEEP * t1;
      const alpha = 0.008 + 0.18 * Math.pow(1 - t1, 2.05);

      return {
        key: `seg-${index}`,
        d: createShortArcPath(center, ringRadius, startAngle, endAngle),
        alpha,
      };
    });

    return {
      segments,
    };
  }, [ringRadius, ringSize]);

  const metrics = useMemo(() => {
    let totalNeedsLogged = 0;

    for (const tx of transactions) {
      if (tx.needSelection?.key) {
        totalNeedsLogged += 1;
      }
    }

    return {
      needsLogged: totalNeedsLogged,
      totalLogged: transactions.length,
    };
  }, [transactions]);

  useEffect(() => {
    rotation.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const ringSpinStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.logoWrap}>
            <FiyLogo size={32} />
          </View>

          <View style={styles.pillsWrap}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{metrics.needsLogged} needs logged</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{metrics.totalLogged} total txns</Text>
            </View>
          </View>

          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={styles.settingsButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Feather name="settings" size={18} color="#E4E4E7" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>Record a transaction?</Text>

          <View style={[styles.orbStage, { width: ringSize, height: ringSize }]}>
            <AnimatedSvg width={ringSize} height={ringSize} style={[styles.ring, ringSpinStyle]}>
              {arcGeometry.segments.map((segment) => (
                <Path
                  key={segment.key}
                  d={segment.d}
                  stroke="#E4E4E7"
                  strokeOpacity={segment.alpha}
                  strokeWidth={ringStrokeWidth}
                  strokeLinecap="butt"
                  fill="none"
                />
              ))}
            </AnimatedSvg>

            <Pressable
              onPress={() => setIsRecordDrawerOpen(true)}
              onPressIn={plusPress.onPressIn}
              onPressOut={plusPress.onPressOut}
              onLayout={plusPress.onLayout}
              accessibilityRole="button"
              accessibilityLabel="Record transaction button"
            >
              <Animated.View style={[styles.plusButton, plusPress.animatedStyle]}>
                <Feather name="plus" size={30} color="#09090B" />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>
      <EditTransactionDrawer
        mode="create"
        transaction={null}
        open={isRecordDrawerOpen}
        onClose={() => setIsRecordDrawerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  container: {
    flex: 1,
    backgroundColor: "#09090B",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.24)",
    backgroundColor: "rgba(24,24,27,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "rgba(39,39,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.12)",
  },
  pillText: {
    color: "#F4F4F5",
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.2,
    fontWeight: "500",
  },
  logoWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 110,
  },
  title: {
    width: "88%",
    textAlign: "center",
    color: "#FAFAFA",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
    marginBottom: 56,
  },
  orbStage: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  plusButton: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
});
