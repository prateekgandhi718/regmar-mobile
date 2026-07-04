import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Keyboard, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import { SetupProgressHeader } from "../SetupProgressHeader";
import type { StepTransitionStyle } from "../types";

type SetupNameStepProps = {
  transition: StepTransitionStyle;
  name: string;
  error: string | null;
  onNameChange: (value: string) => void;
  onBack?: () => void;
  onContinue: () => void;
  isLoading?: boolean;
};

export function SetupNameStep({ transition, name, error, onNameChange, onBack, onContinue, isLoading = false }: SetupNameStepProps) {
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      Animated.timing(keyboardOffset, {
        toValue: -Math.max(0, event.endCoordinates.height - 14),
        duration: event.duration ?? 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: event.duration ?? 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black">
      <Animated.View
        style={{
          flex: 1,
          opacity: transition.opacity,
          transform: [{ translateX: transition.translateX }, { translateY: keyboardOffset }],
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 24,
        }}
      >
        <SetupProgressHeader current={2} total={4} onBack={onBack} />
        <View className="flex-1 justify-center">
          <Text
            className="text-[44px] leading-[50px] text-zinc-50"
            style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            What should we call you?
          </Text>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            autoCapitalize="words"
            placeholder="Your name"
            placeholderTextColor="#71717A"
            className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
          />
          {error ? <Text className="mt-3 text-sm text-red-400">{error}</Text> : null}
        </View>
        <Pressable
          onPress={onContinue}
          disabled={isLoading}
          className="items-center justify-center rounded-full px-6 py-4"
          style={{ backgroundColor: isLoading ? "#A1A1AA" : "#F4F4F5" }}
        >
          {isLoading ? <ActivityIndicator color="#111827" /> : <Text className="text-lg font-semibold text-zinc-900">Continue</Text>}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
