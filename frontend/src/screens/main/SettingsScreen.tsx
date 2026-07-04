import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { clearAllAccountsLocal } from "@/lib/accounts-db";
import { clearAllAuthLocalStorage } from "@/lib/auth-storage";
import { clearInvestmentStorage } from "@/lib/investments-storage";
import { clearAllTransactionsLocal } from "@/lib/transactions-db";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { logout } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useClearTransactionsMutation } from "@/redux/api/transactionsApi";
import { ModeToggle } from "@/components/mode-toggle";
import { withOpacity } from "@/theme/color-theme";

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useColorTheme();
  const [clearTransactions, { isLoading: isClearingTransactions }] = useClearTransactionsMutation();
  const [isResettingAppData, setIsResettingAppData] = useState(false);

  const handleClearTransactions = () => {
    if (isClearingTransactions) return;
    Alert.alert("Clear local transactions?", "This removes all synced transactions from local storage.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await clearTransactions().unwrap();
            Toast.show({ type: "success", text1: "Transactions cleared" });
          } catch (error) {
            console.error("Failed to clear transactions", error);
            Toast.show({ type: "error", text1: "Could not clear transactions" });
          }
        },
      },
    ]);
  };

  const handleResetAppData = () => {
    if (isResettingAppData) return;

    Alert.alert(
      "Reset app data?",
      "This clears all local auth, transactions, accounts, and investments and returns to onboarding.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setIsResettingAppData(true);
              await Promise.all([
                clearAllAuthLocalStorage(),
                clearInvestmentStorage(),
                clearAllTransactionsLocal(),
                clearAllAccountsLocal(),
              ]);
              dispatch(logout());
              Toast.show({ type: "success", text1: "Local app data reset" });
            } catch (error) {
              console.error("Failed to reset local app data", error);
              Toast.show({ type: "error", text1: "Could not reset app data" });
            } finally {
              setIsResettingAppData(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => navigation.goBack()}
              className="h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              hitSlop={8}
            >
              <Feather name="chevron-left" size={20} color={colors.primary} />
            </Pressable>
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
              SETTINGS
            </Text>
          </View>
          <ModeToggle />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
        >
          <EmailLinkGate
            title="Link the email"
            description="Connect your inbox here to enable transaction, accounts, and investment sync across the app."
            showLinkedStateWhenLinked
          >
            <></>
          </EmailLinkGate>

          <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <View className="flex-row items-center gap-2">
              <Feather name="trash-2" size={16} color={colors.secondary} />
              <Text className="text-base font-bold text-zinc-900 dark:text-zinc-100">Local Transaction Data</Text>
            </View>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Clear local transactions to test sync flow from a clean state.
            </Text>
            <Pressable
              onPress={handleClearTransactions}
              disabled={isClearingTransactions}
              className="mt-4 items-center justify-center rounded-xl border px-4 py-3"
              style={{ borderColor: withOpacity(colors.secondary, 0.45), backgroundColor: withOpacity(colors.secondary, 0.12) }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.secondary }}>
                {isClearingTransactions ? "Clearing..." : "Clear transactions"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleResetAppData}
              disabled={isResettingAppData}
              className="mt-3 items-center justify-center rounded-xl border px-4 py-3"
              style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.12) }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                {isResettingAppData ? "Resetting..." : "Reset local app data"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
