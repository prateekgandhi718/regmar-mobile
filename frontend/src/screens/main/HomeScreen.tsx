import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { FiyLogo } from "@/components/fiy-logo";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { getStoredName } from "@/lib/auth-storage";

export function HomeScreen() {
  const { colors } = useColorTheme();
  const [name, setName] = useState("User");

  useEffect(() => {
    let active = true;

    const loadName = async () => {
      const storedName = await getStoredName();
      if (active && storedName?.trim()) {
        setName(storedName.trim());
      }
    };

    loadName();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <FiyLogo size={30} color={colors.primary} />
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
              FIY
            </Text>
          </View>
        </View>

        <View className="flex-1 px-6 pb-32 pt-8">
          <Text className="text-base font-medium text-zinc-600 dark:text-zinc-300">Hello, {name}!</Text>
          <Text className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50" style={{ color: colors.primary }}>
            Your Summary
          </Text>

          <EmailLinkGate
            title="Link your email to get started"
            description="Connect the inbox where you receive banking alerts to unlock transaction sync and insights."
          >
            <View className="mt-8 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 dark:border-zinc-700 dark:bg-zinc-900">
              <Text className="text-base font-medium text-zinc-700 dark:text-zinc-200">No transactions yet</Text>
              <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Your summary will appear here once transaction syncing is enabled.
              </Text>
            </View>
          </EmailLinkGate>
        </View>
      </View>
    </SafeAreaView>
  );
}
