import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { NeedInsight, StepTransitionStyle } from "../types";

type InsightsStepProps = {
  transition: StepTransitionStyle;
  insights: NeedInsight[];
  progressValues: Animated.Value[];
  copyOpacity: Animated.Value;
  copyTranslateY: Animated.Value;
  onContinue: () => void;
};

export function InsightsStep({
  transition,
  insights,
  progressValues,
  copyOpacity,
  copyTranslateY,
  onContinue,
}: InsightsStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-6 pt-2">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <View className="flex-1 justify-start pt-10">
          <View className="items-center">
            {insights.map((insight, index) => {
              const progress = progressValues[index];
              const cardWidth = progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [18, 18, insight.width],
              });
              const cardHeight = progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [18, 18, 48],
              });
              const cardTranslateX = progress.interpolate({
                inputRange: [0, 1],
                outputRange: [151, 0],
              });
              const labelOpacity = progress.interpolate({
                inputRange: [0, 0.55, 1],
                outputRange: [0, 0.15, 1],
              });

              return (
                <Animated.View
                  key={insight.label}
                  style={{
                    width: 320,
                    height: 52,
                    marginBottom: 8,
                    justifyContent: "center",
                  }}
                >
                  <Animated.View
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      transform: [{ translateX: cardTranslateX }],
                      backgroundColor: "#181820",
                      justifyContent: "center",
                      overflow: "hidden",
                      borderTopLeftRadius: insight.radii[0],
                      borderTopRightRadius: insight.radii[1],
                      borderBottomRightRadius: insight.radii[2],
                      borderBottomLeftRadius: insight.radii[3],
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 44,
                        backgroundColor: insight.color,
                      }}
                    />
                    <Animated.Text
                      style={{
                        opacity: labelOpacity,
                        marginLeft: 58,
                        color: "#F5F5F5",
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {insight.label}
                      <Text style={{ color: insight.color }}> {insight.score}</Text>
                    </Animated.Text>
                  </Animated.View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <Animated.View style={{ opacity: copyOpacity, transform: [{ translateY: copyTranslateY }] }}>
          <Text
            className="text-center text-[58px] leading-[64px] text-zinc-50"
            style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            And over time, spot
            {"\n"}patterns to gain insighs
          </Text>
          <Pressable
            onPress={onContinue}
            className="mt-6 items-center justify-center rounded-full px-6 py-4"
            style={{ backgroundColor: "#F4F4F5" }}
          >
            <Text className="text-lg font-semibold text-zinc-900">Continue</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}
