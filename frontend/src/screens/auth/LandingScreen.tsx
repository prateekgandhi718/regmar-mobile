import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FiyLogo } from "@/components/fiy-logo";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Landing">;

export function LandingScreen({ navigation }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.54)).current;
  const circleScale = useRef(new Animated.Value(1.8)).current;
  const circleOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(circleOpacity, {
          toValue: 0,
          duration: 980,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(circleScale, {
          toValue: 0.2,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 960,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 960,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(220),
    ]).start(() => {
      navigation.replace("Onboarding");
    });
  }, [circleOpacity, circleScale, logoOpacity, logoScale, navigation]);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          style={{
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: "#FFFFFF",
            opacity: circleOpacity,
            transform: [{ scale: circleScale }],
          }}
        />
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <FiyLogo size={88} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
