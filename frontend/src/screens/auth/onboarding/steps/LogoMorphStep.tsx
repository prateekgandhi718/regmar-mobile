import { Animated, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";

type LogoMorphStepProps = {
  logoOpacity: Animated.Value;
  logoScale: Animated.Value;
  circleOpacity: Animated.Value;
  circleScale: Animated.Value;
};

export function LogoMorphStep({ logoOpacity, logoScale, circleOpacity, circleScale }: LogoMorphStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center">
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
          <FiyLogo size={82} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
