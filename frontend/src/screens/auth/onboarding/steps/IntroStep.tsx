import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { StepTransitionStyle } from "../types";

type IntroStepProps = {
  transition: StepTransitionStyle;
  onContinue: () => void;
};

export function IntroStep({ transition, onContinue }: IntroStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-8 pt-6">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <View className="flex-1">
          <View className="flex-row items-center justify-center pt-4">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-zinc-950">
              <FiyLogo size={44} />
            </View>
          </View>

          <View className="mt-10 flex-row justify-between px-2">
            <View className="h-[150px] w-[44%] rounded-[44px] rounded-br-[12px]" style={{ backgroundColor: "#FF4D6D" }} />
            <View className="h-[118px] w-[44%] rounded-[40px] rounded-bl-[12px]" style={{ backgroundColor: "#F4C84A" }} />
          </View>
          <View className="mt-8 flex-row justify-between px-2">
            <View className="h-[118px] w-[44%] rounded-[40px] rounded-tr-[12px]" style={{ backgroundColor: "#7EA6FF" }} />
            <View className="h-[150px] w-[44%] rounded-[44px] rounded-tl-[12px]" style={{ backgroundColor: "#69E3B0" }} />
          </View>

          <View className="mt-12">
            <Text
              className="text-[48px] leading-[56px] text-zinc-50"
              style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
            >
              Understand your
              {"\n"}relationship with money
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onContinue}
          className="items-center justify-center rounded-full px-6 py-4"
          style={{ backgroundColor: "#F4F4F5" }}
        >
          <Text className="text-lg font-semibold text-zinc-900">Get Started</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
