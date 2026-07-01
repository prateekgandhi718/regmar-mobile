import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { ModeToggle } from "@/components/mode-toggle";

export function SettingsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1 px-6 pb-32 pt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Settings</Text>
          <ModeToggle />
        </View>

        <EmailLinkGate
          title="Link the email"
          description="Connect your inbox here to enable transaction, accounts, and investment sync across the app."
          showLinkedStateWhenLinked
        >
          <Text className="mt-6 text-base text-zinc-600 dark:text-zinc-300">
            App preferences and account settings will appear here.
          </Text>
        </EmailLinkGate>
      </View>
    </SafeAreaView>
  );
}
