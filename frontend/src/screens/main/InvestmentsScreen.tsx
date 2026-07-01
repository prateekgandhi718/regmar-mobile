import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";

export function InvestmentsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1 px-6 pb-32 pt-6">
        <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Investments</Text>
        <EmailLinkGate
          title="Link email to see all your investments"
          description="Connect your inbox to fetch CAS and broker mails so you can track investments and optimize your stock portfolio."
        >
          <Text className="mt-2 text-base text-zinc-600 dark:text-zinc-300">
            Your investment summaries and analytics will appear here.
          </Text>
        </EmailLinkGate>
      </View>
    </SafeAreaView>
  );
}
