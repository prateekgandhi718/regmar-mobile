import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { LinkedAccountProvider } from "@/redux/api/linkedAccountsApi";
import { SetupProgressHeader } from "../SetupProgressHeader";
import type { StepTransitionStyle } from "../types";

type SetupEmailProviderStepProps = {
  transition: StepTransitionStyle;
  onBack?: () => void;
  onSkip?: () => void;
  onSelectProvider: (provider: LinkedAccountProvider) => void;
};

export function SetupEmailProviderStep({ transition, onBack, onSkip, onSelectProvider }: SetupEmailProviderStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-8 pt-16">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <SetupProgressHeader current={3} total={4} onBack={onBack} />
        <ScrollView
          className="mt-2"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="mt-8">
            <Text
              className="text-[54px] leading-[60px] text-zinc-50"
              style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
            >
              Link your email
            </Text>
            <Text className="mt-4 text-lg leading-8 text-zinc-300">
              Choose your email provider. You&apos;ll connect it securely using an app password.
            </Text>
            {onSkip ? (
              <Pressable onPress={onSkip} className="mt-2 self-start py-1" hitSlop={6}>
                <Text className="text-xs text-zinc-500">Skip for now</Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-10 gap-4">
            <Pressable
              onPress={() => onSelectProvider("gmail")}
              className="rounded-3xl border border-zinc-700 bg-zinc-950 p-5"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
                  <Feather name="mail" size={18} color="#F4F4F5" />
                </View>
                <Text className="text-2xl text-zinc-50" style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}>
                  Gmail
                </Text>
              </View>
              <Text className="mt-3 text-base leading-7 text-zinc-300">Use your Gmail address with a 16-character app password.</Text>
            </Pressable>

            <Pressable
              onPress={() => onSelectProvider("icloud")}
              className="rounded-3xl border border-zinc-700 bg-zinc-950 p-5"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
                  <Feather name="cloud" size={18} color="#F4F4F5" />
                </View>
                <Text className="text-2xl text-zinc-50" style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}>
                  iCloud
                </Text>
              </View>
              <Text className="mt-3 text-base leading-7 text-zinc-300">Use your iCloud address with an Apple app-specific password.</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
