import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import { SetupHiIllustration } from "../SetupHiIllustration";
import { SetupProgressHeader } from "../SetupProgressHeader";
import type { StepTransitionStyle } from "../types";

type SetupHiStepProps = {
  transition: StepTransitionStyle;
  onBack?: () => void;
  onContinue: () => void;
};

export function SetupHiStep({ transition, onBack, onContinue }: SetupHiStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-8 pt-16">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <SetupProgressHeader current={1} total={4} onBack={onBack} />
        <Text
          className="mt-8 text-[62px] leading-[66px] text-zinc-50"
          style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
        >
          Hi and welcome
          {"\n"}to FIY!
        </Text>
        <Text className="mt-5 text-xl leading-8 text-zinc-300">
          Let’s take a few minutes to get you setup. Make sure you’re ready for a few simple steps.
        </Text>

        <View className="flex-1 items-center justify-center">
          <SetupHiIllustration />
        </View>

        <Pressable
          onPress={onContinue}
          className="items-center justify-center rounded-full px-6 py-4"
          style={{ backgroundColor: "#F4F4F5" }}
        >
          <Text className="text-lg font-semibold text-zinc-900">Continue</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
