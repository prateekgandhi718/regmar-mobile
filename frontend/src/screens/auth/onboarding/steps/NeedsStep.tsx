import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { BubbleNeed, StepTransitionStyle } from "../types";

type NeedsStepProps = {
  transition: StepTransitionStyle;
  bubbles: BubbleNeed[];
  onContinue: () => void;
};

export function NeedsStep({ transition, bubbles, onContinue }: NeedsStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <View className="absolute inset-0 overflow-hidden">
          <View className="-left-12 -right-12 -top-10 flex-row flex-wrap" style={{ position: "absolute" }}>
            {bubbles.map((bubble) => (
              <View
                key={bubble.label}
                className="items-center justify-center rounded-full"
                style={{
                  width: bubble.size,
                  height: bubble.size,
                  backgroundColor: bubble.color,
                  marginHorizontal: 9,
                  marginVertical: 9,
                }}
              >
                <Text
                  className="px-3 text-center text-[22px] leading-[26px] text-zinc-950"
                  style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
                >
                  {bubble.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View className="absolute inset-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }} />
        <View className="flex-1 justify-end px-6 pb-8">
          <Text
            className="text-[50px] leading-[56px] text-zinc-50"
            style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            Find needs
            {"\n"}behind your spends
          </Text>
          <Pressable
            onPress={onContinue}
            className="mt-6 items-center justify-center rounded-full px-6 py-4"
            style={{ backgroundColor: "#F4F4F5" }}
          >
            <Text className="text-lg font-semibold text-zinc-900">Continue</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
