import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";
import { getOrCreateDeviceUuid, saveAuthTokens, setStoredName } from "@/lib/auth-storage";
import { setSession } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useRegisterDeviceMutation } from "@/redux/api/authApi";

export function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registerDevice, { isLoading }] = useRegisterDeviceMutation();

  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    setError(null);

    try {
      const deviceUuid = await getOrCreateDeviceUuid();
      const response = await registerDevice({ deviceUuid, name: trimmedName }).unwrap();

      await Promise.all([
        setStoredName(trimmedName),
        saveAuthTokens(response.accessToken, response.refreshToken),
      ]);

      dispatch(setSession({ accessToken: response.accessToken, refreshToken: response.refreshToken }));
    } catch (requestError) {
      console.error("Device registration failed:", requestError);
      setError("Could not create your account. Please try again.");
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white px-6 pb-10 pt-8 dark:bg-zinc-950">
      <View className="mb-10 flex-row items-center gap-2">
        <FiyLogo size={32} />
        <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">FIY</Text>
      </View>

      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Welcome</Text>
        <Text className="mt-3 text-base text-zinc-600 dark:text-zinc-300">Enter your name to create your device account.</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          autoCapitalize="words"
          placeholder="Your name"
          placeholderTextColor="#71717a"
          className="mt-8 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        {error ? <Text className="mt-3 text-sm text-red-500">{error}</Text> : null}

        <Pressable
          onPress={handleContinue}
          disabled={isLoading}
          className="mt-6 items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 dark:bg-zinc-100"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-zinc-100 dark:text-zinc-900">Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
