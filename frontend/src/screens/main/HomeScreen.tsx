import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "@/components/providers/theme-provider";
import { getStoredName } from "@/lib/auth-storage";

export function HomeScreen() {
  const { isDark } = useTheme();
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
            <FiyLogo size={30} color={isDark ? "#fafafa" : "#0a0a0a"} />
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">FIY</Text>
          </View>
          <ModeToggle />
        </View>

        <View className="flex-1 px-6 pb-32 pt-8">
          <Text className="text-base font-medium text-zinc-600 dark:text-zinc-300">Hello, {name}!</Text>
          <Text className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Your Summary</Text>
          <Text className="mt-2 text-base text-zinc-600 dark:text-zinc-300">This will show your latest transaction insights.</Text>

          <View className="mt-8 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 dark:border-zinc-700 dark:bg-zinc-900">
            <Text className="text-base font-medium text-zinc-700 dark:text-zinc-200">No transactions yet</Text>
            <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">Your summary will appear here once transaction syncing is enabled.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
