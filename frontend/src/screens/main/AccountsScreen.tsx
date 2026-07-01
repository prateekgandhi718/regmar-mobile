import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";

export function AccountsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1 px-6 pb-32 pt-6">
        <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Accounts</Text>
        <EmailLinkGate
          title="Link email before adding accounts"
          description="Connect Gmail or iCloud first, then add and sync your financial accounts in one place."
        >
          <Text className="mt-2 text-base text-zinc-600 dark:text-zinc-300">
            Linked and manual account details will appear here.
          </Text>
        </EmailLinkGate>
      </View>
    </SafeAreaView>
  );
}
