import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { useColorTheme } from "@/components/providers/color-theme-provider";

export function TransactionsScreen() {
  const { colors } = useColorTheme();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1 px-6 pb-32 pt-6">
        <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
          Txns
        </Text>
        <EmailLinkGate
          title="Link your email to view transactions"
          description="Connect Gmail or iCloud to automatically pull and categorize your latest transactions."
        >
          <Text className="mt-2 text-base text-zinc-600 dark:text-zinc-300">
            Your latest transactions and categorization will appear here.
          </Text>
        </EmailLinkGate>
      </View>
    </SafeAreaView>
  );
}
