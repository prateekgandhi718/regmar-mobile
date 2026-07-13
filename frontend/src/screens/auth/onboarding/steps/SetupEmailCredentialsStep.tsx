import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Animated, Linking, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { LinkedAccountProvider } from "@/redux/api/linkedAccountsApi";
import { SetupProgressHeader } from "../SetupProgressHeader";
import type { StepTransitionStyle } from "../types";

type SetupEmailCredentialsStepProps = {
  transition: StepTransitionStyle;
  provider: LinkedAccountProvider;
  email: string;
  appPassword: string;
  error: string | null;
  isLoading?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  onEmailChange: (value: string) => void;
  onAppPasswordChange: (value: string) => void;
  onContinue: () => void;
};

const PROVIDER_COPY: Record<LinkedAccountProvider, { title: string; placeholder: string; appPasswordUrl: string }> = {
  gmail: {
    title: "Gmail",
    placeholder: "name@gmail.com",
    appPasswordUrl: "https://myaccount.google.com/apppasswords",
  },
  icloud: {
    title: "iCloud",
    placeholder: "name@icloud.com",
    appPasswordUrl: "https://appleid.apple.com/account/manage",
  },
};

export function SetupEmailCredentialsStep({
  transition,
  provider,
  email,
  appPassword,
  error,
  isLoading = false,
  onBack,
  onSkip,
  onEmailChange,
  onAppPasswordChange,
  onContinue,
}: SetupEmailCredentialsStepProps) {
  const providerCopy = PROVIDER_COPY[provider];

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-black px-6 pb-8 pt-16">
      <Animated.View style={{ flex: 1, opacity: transition.opacity, transform: [{ translateX: transition.translateX }] }}>
        <SetupProgressHeader current={3} total={4} onBack={onBack} />

        <View className="mt-8">
          <Text
            className="text-[44px] leading-[50px] text-zinc-50"
            style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            Connect {providerCopy.title}
          </Text>
          <Text className="mt-4 text-lg leading-8 text-zinc-300">Enter your email and app password to finish linking.</Text>
        </View>

        <View className="mt-8 gap-4">
          <View>
            <Text className="mb-2 text-sm text-zinc-300">Email</Text>
            <TextInput
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={providerCopy.placeholder}
              placeholderTextColor="#71717A"
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm text-zinc-300">App password</Text>
            <TextInput
              value={appPassword}
              onChangeText={(value) => onAppPasswordChange(value.replace(/\s+/g, "").slice(0, 16))}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="16-character app password"
              placeholderTextColor="#71717A"
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
            />
          </View>
        </View>

        <Pressable
          onPress={() => {
            Linking.openURL(providerCopy.appPasswordUrl).catch(() => null);
          }}
          className="mt-5 flex-row items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3"
        >
          <Feather name="external-link" size={16} color="#F4F4F5" />
          <Text className="text-sm font-semibold text-zinc-100">Create app password</Text>
        </Pressable>

        <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <Text className="text-base text-zinc-100" style={{ fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}>
            What is an app password?
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-300">
            It is a one-time generated key from your email provider, used by apps like FIY when your account has extra
            security enabled.
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-300">
            FIY only uses this key to read transaction emails. Your credentials are transmitted securely, and you can
            revoke the app password anytime from your provider settings.
          </Text>
        </View>

        {!!error ? <Text className="mt-3 text-sm text-red-400">{error}</Text> : null}

        {onSkip ? (
          <Pressable onPress={onSkip} className="mt-3 self-center px-3 py-1" hitSlop={6}>
            <Text className="text-xs text-zinc-500">Skip for now</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onContinue}
          disabled={isLoading}
          className="mt-auto items-center justify-center rounded-full px-6 py-4"
          style={{ backgroundColor: isLoading ? "#A1A1AA" : "#F4F4F5" }}
        >
          {isLoading ? <ActivityIndicator color="#111827" /> : <Text className="text-lg font-semibold text-zinc-900">Link email</Text>}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
