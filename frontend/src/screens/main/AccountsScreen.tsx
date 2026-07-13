import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountSetupGate } from "@/components/accounts/AccountSetupGate";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

export function AccountsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useColorTheme();
  const { data: accounts = [] } = useGetAccountsQuery();
  const hasAccounts = accounts.length > 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <Text style={[styles.headingText, { color: colors.primary }]}>Accounts</Text>
          {!hasAccounts ? (
            <Pressable
              onPress={() => navigation.navigate("AccountSetup")}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add account"
              hitSlop={8}
            >
              <Feather name="plus" size={18} color="#E4E4E7" />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 px-6 pb-32 pt-8">
          {hasAccounts ? (
            <AccountSetupGate
              title="Add your first account"
              description="Create a bank account profile with currency and sender domains."
              showAccountsList
            >
              <></>
            </AccountSetupGate>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first bank account.</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headingText: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.24)",
    backgroundColor: "rgba(24,24,27,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.12)",
    backgroundColor: "rgba(24,24,27,0.72)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  emptyTitle: {
    color: "#FAFAFA",
    fontSize: 22,
    lineHeight: 26,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
  },
});
