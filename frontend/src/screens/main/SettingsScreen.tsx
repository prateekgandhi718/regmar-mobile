import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { clearAllAccountsLocal } from "@/lib/accounts-db";
import { clearAllAuthLocalStorage } from "@/lib/auth-storage";
import { clearInvestmentStorage } from "@/lib/investments-storage";
import { clearAllTransactionsLocal } from "@/lib/transactions-db";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { logout } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useDeleteMeMutation } from "@/redux/api/authApi";
import { accountsApi } from "@/redux/api/accountsApi";
import { authApi } from "@/redux/api/authApi";
import { categoriesApi } from "@/redux/api/categoriesApi";
import { investmentsApi } from "@/redux/api/investmentsApi";
import {
  isLinkedAccountActive,
  LinkedAccountProvider,
  linkedAccountsApi,
  useGetLinkedAccountsQuery,
  useUnlinkAccountMutation,
} from "@/redux/api/linkedAccountsApi";
import { needsApi } from "@/redux/api/needsApi";
import { nerFeedbackApi } from "@/redux/api/nerFeedbackApi";
import { syncApi } from "@/redux/api/syncApi";
import { useClearTransactionsMutation } from "@/redux/api/transactionsApi";
import { transactionsApi } from "@/redux/api/transactionsApi";
import { txnClassifierApi } from "@/redux/api/txnClassifierApi";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useColorTheme();
  const { data: linkedAccounts = [], isLoading: isLoadingLinkedAccounts } = useGetLinkedAccountsQuery();
  const [clearTransactions, { isLoading: isClearingTransactions }] = useClearTransactionsMutation();
  const [unlinkAccount, { isLoading: isUnlinkingAccount }] = useUnlinkAccountMutation();
  const [deleteMe] = useDeleteMeMutation();
  const [isResettingAppData, setIsResettingAppData] = useState(false);
  const linkedEmailAccount = linkedAccounts.find((account) => isLinkedAccountActive(account.isActive));
  const linkedProvider: LinkedAccountProvider = linkedEmailAccount?.provider === "icloud" ? "icloud" : "gmail";

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
      "This removes your cloud user/account data and clears all local app data, then returns to onboarding.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            let didDeleteCloudData = false;
            try {
              setIsResettingAppData(true);
              try {
                await deleteMe().unwrap();
                didDeleteCloudData = true;
              } catch {
                // Cloud delete endpoint may be unavailable on older backend builds.
              }

              await Promise.all([
                clearAllAuthLocalStorage(),
                clearInvestmentStorage(),
                clearAllTransactionsLocal(),
                clearAllAccountsLocal(),
              ]);
              // Clear all in-memory RTK query caches so no stale local/cloud data remains visible.
              dispatch(authApi.util.resetApiState());
              dispatch(categoriesApi.util.resetApiState());
              dispatch(investmentsApi.util.resetApiState());
              dispatch(linkedAccountsApi.util.resetApiState());
              dispatch(needsApi.util.resetApiState());
              dispatch(nerFeedbackApi.util.resetApiState());
              dispatch(accountsApi.util.resetApiState());
              dispatch(syncApi.util.resetApiState());
              dispatch(transactionsApi.util.resetApiState());
              dispatch(txnClassifierApi.util.resetApiState());
              dispatch(logout());
              Toast.show({
                type: didDeleteCloudData ? "success" : "info",
                text1: didDeleteCloudData ? "App data reset" : "Local data reset",
                text2: didDeleteCloudData ? undefined : "Cloud account delete endpoint not available on current backend.",
              });
            } catch (error) {
              console.error("Failed to reset app data", error);
              Toast.show({ type: "error", text1: "Could not reset app data" });
            } finally {
              setIsResettingAppData(false);
            }
          },
        },
      ],
    );
  };

  const handleUnlink = () => {
    if (!linkedEmailAccount || isUnlinkingAccount) return;

    Alert.alert("Unlink email account?", "This will disable email sync until you reconnect.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          try {
            await unlinkAccount(linkedEmailAccount.id).unwrap();
            Toast.show({
              type: "success",
              text1: "Email unlinked",
              text2: "You can reconnect anytime from settings.",
            });
          } catch (error) {
            const apiError = error as { data?: { message?: string } };
            Toast.show({
              type: "error",
              text1: "Could not unlink account",
              text2: apiError?.data?.message || "Please try again.",
            });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
              <Feather name="arrow-left" size={18} color="#E4E4E7" />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>Settings</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {isLoadingLinkedAccounts ? (
            <View style={styles.card}>
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#D4D4D8" />
                <Text style={styles.loadingText}>Checking linked account...</Text>
              </View>
            </View>
          ) : linkedEmailAccount ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Linked Email</Text>
                <View style={styles.activeChip}>
                  <Text style={styles.activeChipText}>Active</Text>
                </View>
              </View>

              <Text style={styles.emailValue}>{linkedEmailAccount.email}</Text>
              <Text style={styles.providerText}>Provider: {linkedProvider === "icloud" ? "iCloud" : "Gmail"}</Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() =>
                    navigation.navigate("EmailCredentials", {
                      mode: "edit",
                      provider: linkedProvider,
                      email: linkedEmailAccount.email,
                    })
                  }
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Edit credentials</Text>
                </Pressable>
                <Pressable
                  onPress={handleUnlink}
                  disabled={isUnlinkingAccount}
                  style={styles.button}
                >
                  {isUnlinkingAccount ? (
                    <ActivityIndicator size="small" color="#E4E4E7" />
                  ) : (
                    <Text style={styles.buttonText}>Unlink email</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No email linked</Text>
              <Text style={styles.cardDescription}>Choose a provider and connect your mailbox with an app password.</Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() =>
                    navigation.navigate("EmailCredentials", {
                      mode: "create",
                      provider: "gmail",
                    })
                  }
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Link Gmail</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate("EmailCredentials", {
                      mode: "create",
                      provider: "icloud",
                    })
                  }
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Link iCloud</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Data Controls</Text>
            <Text style={styles.cardDescription}>Use these actions for local sync testing or full reset when onboarding again.</Text>

            <Pressable onPress={handleClearTransactions} disabled={isClearingTransactions} style={styles.button}>
              <Text style={styles.buttonText}>{isClearingTransactions ? "Clearing..." : "Clear transactions"}</Text>
            </Pressable>

            <Pressable onPress={handleResetAppData} disabled={isResettingAppData} style={[styles.button, { marginTop: 10 }]}>
              <Text style={styles.buttonText}>{isResettingAppData ? "Resetting..." : "Reset app data"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#09090B",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.24)",
    backgroundColor: "rgba(24,24,27,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 44,
    paddingTop: 14,
    gap: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.12)",
    backgroundColor: "rgba(24,24,27,0.72)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#D4D4D8",
    fontSize: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    color: "#FAFAFA",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
  },
  activeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.2)",
    backgroundColor: "rgba(39,39,42,0.86)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeChipText: {
    color: "#E4E4E7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  emailValue: {
    marginTop: 10,
    color: "#FAFAFA",
    fontSize: 18,
    fontWeight: "500",
  },
  providerText: {
    marginTop: 4,
    color: "#B4B4BC",
    fontSize: 14,
  },
  cardDescription: {
    marginTop: 8,
    color: "#C4C4CC",
    fontSize: 15,
    lineHeight: 24,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.32)",
    backgroundColor: "rgba(39,39,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  buttonText: {
    color: "#E4E4E7",
    fontSize: 15,
    fontWeight: "700",
  },
});
