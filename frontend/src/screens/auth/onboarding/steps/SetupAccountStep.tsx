import { ActivityIndicator, Animated, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import { SetupProgressHeader } from "../SetupProgressHeader";
import type { StepTransitionStyle } from "../types";

type SetupAccountStepProps = {
  transition: StepTransitionStyle;
  bankName: string;
  domains: string;
  last4: string;
  error: string | null;
  isSaving?: boolean;
  onBankNameChange: (value: string) => void;
  onDomainsChange: (value: string) => void;
  onLast4Change: (value: string) => void;
  onSave: () => void;
};

export function SetupAccountStep({
  transition,
  bankName,
  domains,
  last4,
  error,
  isSaving = false,
  onBankNameChange,
  onDomainsChange,
  onLast4Change,
  onSave,
}: SetupAccountStepProps) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black">
      <Animated.View
        style={{
          flex: 1,
          opacity: transition.opacity,
          transform: [{ translateX: transition.translateX }],
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 24,
        }}
      >
        <SetupProgressHeader current={4} total={4} />
        <View className="mt-8">
          <Text
            className="text-[44px] leading-[50px] text-zinc-50"
            style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            Add an account
          </Text>
          <Text className="mt-4 text-lg leading-8 text-zinc-300">
            Add your bank and the sender domains you receive transaction alerts from.
          </Text>
        </View>

        <View className="mt-8 gap-4">
          <View>
            <Text className="mb-2 text-sm text-zinc-300">Bank name</Text>
            <TextInput
              value={bankName}
              onChangeText={onBankNameChange}
              autoCapitalize="words"
              placeholder="HDFC Bank"
              placeholderTextColor="#71717A"
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm text-zinc-300">Domain(s)</Text>
            <TextInput
              value={domains}
              onChangeText={onDomainsChange}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="alerts@hdfcbank.net, noreply@hdfcbank.com"
              placeholderTextColor="#71717A"
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
            />
            <Text className="mt-2 text-xs leading-5 text-zinc-400">
              Enter only alert sender domains/emails (for example: `alerts@hdfcbank.net`). FIY will only access
              emails from the domains you add here and ignores all other emails.
            </Text>
          </View>

          <View>
            <Text className="mb-2 text-sm text-zinc-300">Last 4 digits (optional)</Text>
            <TextInput
              value={last4}
              onChangeText={onLast4Change}
              keyboardType="number-pad"
              placeholder="1234"
              placeholderTextColor="#71717A"
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
            />
          </View>

          {!!error ? <Text className="text-sm text-red-400">{error}</Text> : null}
        </View>

        <Pressable
          onPress={onSave}
          disabled={isSaving}
          className="mt-auto items-center justify-center rounded-full px-6 py-4"
          style={{ backgroundColor: isSaving ? "#A1A1AA" : "#F4F4F5" }}
        >
          {isSaving ? <ActivityIndicator color="#111827" /> : <Text className="text-lg font-semibold text-zinc-900">Save account</Text>}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
