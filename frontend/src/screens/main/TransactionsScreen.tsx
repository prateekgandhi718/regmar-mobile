import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { FiyLogo } from "@/components/fiy-logo";
import { useColorTheme } from "@/components/providers/color-theme-provider";

export function TransactionsScreen() {
  const { colors } = useColorTheme();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <FiyLogo size={30} color={colors.primary} />
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
              Transactions
            </Text>
          </View>
        </View>

        <View className="flex-1 px-6 pb-32 pt-8">
          <EmailLinkGate
            title="Link your email to view transactions"
            description="Connect Gmail or iCloud to automatically pull and categorize your latest transactions."
          >
            <></>
          </EmailLinkGate>
        </View>
      </View>
    </SafeAreaView>
  );
}
