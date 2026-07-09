import { useMemo, useRef, useState } from "react";
import { Animated, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";

type TiltPressConfig = {
  pressedScale?: number;
  tiltDegrees?: number;
  perspective?: number;
};

const DEFAULT_CONFIG: Required<TiltPressConfig> = {
  pressedScale: 0.988,
  tiltDegrees: 2.2,
  perspective: 900,
};

export function useTiltPress(config?: TiltPressConfig) {
  const settings = { ...DEFAULT_CONFIG, ...config };
  const scale = useRef(new Animated.Value(1)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const [cardSize, setCardSize] = useState({ width: 1, height: 1 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCardSize({ width, height });
    }
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }),
      Animated.spring(tiltX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  };

  const onPressIn = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const xRatio = (locationX / cardSize.width - 0.5) * 2;
    const yRatio = (locationY / cardSize.height - 0.5) * 2;

    Animated.parallel([
      Animated.spring(scale, { toValue: settings.pressedScale, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(tiltX, { toValue: -yRatio * settings.tiltDegrees, useNativeDriver: true, speed: 24, bounciness: 3 }),
      Animated.spring(tiltY, { toValue: xRatio * settings.tiltDegrees, useNativeDriver: true, speed: 24, bounciness: 3 }),
    ]).start();
  };

  const animatedStyle = useMemo(
    () =>
      ({
        transform: [
          { perspective: settings.perspective },
          {
            rotateX: tiltX.interpolate({
              inputRange: [-8, 8],
              outputRange: ["-8deg", "8deg"],
            }),
          },
          {
            rotateY: tiltY.interpolate({
              inputRange: [-8, 8],
              outputRange: ["-8deg", "8deg"],
            }),
          },
          { scale },
        ],
      }) as const,
    [scale, settings.perspective, tiltX, tiltY],
  );

  return {
    animatedStyle,
    onLayout,
    onPressIn,
    onPressOut,
  };
}
