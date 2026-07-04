import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { StepTransitionStyle } from "../types";

type PrivacyStepProps = {
  transition: StepTransitionStyle;
  onAccept: () => void;
};

export function PrivacyStep({ transition, onAccept }: PrivacyStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-8 pt-16">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <View className="flex-row items-center">
          <FiyLogo size={34} />
        </View>

        <Text
          className="mt-8 text-[52px] leading-[58px] text-zinc-50"
          style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
        >
          Terms & Privacy
        </Text>

        <Text
          className="mt-10 text-[36px] leading-[42px] text-zinc-50"
          style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
        >
          Your data is yours
        </Text>

        <Text className="mt-4 text-base leading-7 text-zinc-300">
          Your financial reflections stay private. We do not use AI to process your personal entries, and we do not
          sell your data.
        </Text>
        <Text className="mt-4 text-base leading-7 text-zinc-300">
          By default, your information stays on your device. We do not store personal data to improve models unless you
          explicitly opt in.
        </Text>
        <Text className="mt-8 text-base leading-7 text-zinc-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <View className="flex-1 justify-end">
          <Pressable
            onPress={onAccept}
            className="items-center justify-center rounded-full px-6 py-4"
            style={{ backgroundColor: "#F4F4F5" }}
          >
            <Text className="text-lg font-semibold text-zinc-900">I Accept</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
