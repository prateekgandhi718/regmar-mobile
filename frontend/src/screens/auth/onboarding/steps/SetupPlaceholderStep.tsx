import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import { SetupProgressHeader } from "../SetupProgressHeader";
import type { StepTransitionStyle } from "../types";

type SetupPlaceholderStepProps = {
  transition: StepTransitionStyle;
  progress: number;
  title: string;
  description: string;
  ctaLabel: string;
  onBack: () => void;
  onContinue: () => void;
  isLoading?: boolean;
  ctaColor?: string;
  ctaTextColor?: string;
};

export function SetupPlaceholderStep({
  transition,
  progress,
  title,
  description,
  ctaLabel,
  onBack,
  onContinue,
  isLoading = false,
  ctaColor = "#F4F4F5",
  ctaTextColor = "#111827",
}: SetupPlaceholderStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-8 pt-16">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <SetupProgressHeader current={progress} total={4} onBack={onBack} />
        <View className="flex-1 justify-center">
          <Text
            className="text-[54px] leading-[60px] text-zinc-50"
            style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            {title}
          </Text>
          <Text className="mt-4 text-lg leading-8 text-zinc-300">{description}</Text>
        </View>
        <Pressable
          onPress={onContinue}
          disabled={isLoading}
          className="items-center justify-center rounded-full px-6 py-4"
          style={{ backgroundColor: isLoading ? "#A1A1AA" : ctaColor }}
        >
          {isLoading ? (
            <ActivityIndicator color={ctaTextColor} />
          ) : (
            <Text className="text-lg font-semibold" style={{ color: ctaTextColor }}>
              {ctaLabel}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
