import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FiyLogo } from "@/components/fiy-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "@/components/providers/theme-provider";

import documentsLight from "@/assets/marketing/documents.png";
import documentsDark from "@/assets/marketing/documents-dark.png";
import readingLight from "@/assets/marketing/reading.png";
import readingDark from "@/assets/marketing/reading-dark.png";

export function HomeScreen() {
  const { isDark } = useTheme();

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white dark:bg-zinc-950">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <FiyLogo size={30} color={isDark ? "#fafafa" : "#0a0a0a"} />
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">FIY</Text>
          </View>
          <ModeToggle />
        </View>

        <View className="flex-1 items-center justify-center px-6 pb-6 pt-6">
          <Text className="text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your transactions and investments. Unified. Welcome to <Text className="underline">FIY</Text>
          </Text>
          <Text className="mt-4 max-w-xl text-center text-base text-zinc-600 dark:text-zinc-300">
            FIY automatically fetches and organizes your financial activity.
          </Text>

          <View className="mt-10 w-full flex-row items-center justify-between px-5">
            <View className="w-[48%] items-center">
              <Image source={isDark ? documentsDark : documentsLight} resizeMode="contain" className="h-[190px] w-[190px]" />
            </View>
            <View className="w-[48%] items-center">
              <Image source={isDark ? readingDark : readingLight} resizeMode="contain" className="h-[190px] w-[190px]" />
            </View>
          </View>
        </View>

        <MarketingFooter />
      </View>
    </SafeAreaView>
  );
}
