import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { clearAllAuthLocalStorage } from "@/lib/auth-storage";
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
import { syncApi } from "@/redux/api/syncApi";
import { useClearTransactionsMutation } from "@/redux/api/transactionsApi";
import { transactionsApi } from "@/redux/api/transactionsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: linkedAccounts = [], isLoading: isLoadingLinkedAccounts } = useGetLinkedAccountsQuery();
  const [clearTransactions, { isLoading: isClearingTransactions }] = useClearTransactionsMutation();
  const [unlinkAccount, { isLoading: isUnlinkingAccount }] = useUnlinkAccountMutation();
  const [deleteMe] = useDeleteMeMutation();
  const [isResettingAppData, setIsResettingAppData] = useState(false);
  const linkedEmailAccount = linkedAccounts.find((account) => isLinkedAccountActive(account.isActive));
  const linkedProvider: LinkedAccountProvider = linkedEmailAccount?.provider === "icloud" ? "icloud" : "gmail";

  const handleClearTransactions = () => {
    if (isClearingTransactions) return;
    Alert.alert("Clear transactions?", "This removes all synced transactions from your account.", [
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
      "Delete my data?",
      "This permanently deletes your transactions, accounts, investments, linked email credentials, and profile from MongoDB. You will return to the email connection screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsResettingAppData(true);
              await deleteMe().unwrap();

              await Promise.all([
                clearAllAuthLocalStorage(),
              ]);
              // Clear all in-memory RTK query caches so no stale local/cloud data remains visible.
              dispatch(authApi.util.resetApiState());
              dispatch(categoriesApi.util.resetApiState());
              dispatch(investmentsApi.util.resetApiState());
              dispatch(linkedAccountsApi.util.resetApiState());
              dispatch(accountsApi.util.resetApiState());
              dispatch(syncApi.util.resetApiState());
              dispatch(transactionsApi.util.resetApiState());
              dispatch(logout());
              Toast.show({
                type: "success",
                text1: "Your data was deleted",
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
            <Feather name="arrow-left" size={18} color={PAPER.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {isLoadingLinkedAccounts ? (
            <View style={styles.card}>
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={PAPER.muted} />
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
                    <ActivityIndicator size="small" color={PAPER.ink} />
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
            <Text style={styles.cardDescription}>Manage and permanently remove the data stored with your account.</Text>

            <Pressable onPress={handleClearTransactions} disabled={isClearingTransactions} style={styles.button}>
              <Text style={styles.buttonText}>{isClearingTransactions ? "Clearing..." : "Clear transactions"}</Text>
            </Pressable>

            <Pressable onPress={handleResetAppData} disabled={isResettingAppData} style={[styles.button, { marginTop: 10 }]}>
              <Text style={styles.buttonText}>{isResettingAppData ? "Deleting..." : "Delete my data"}</Text>
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
    backgroundColor: PAPER.page,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: PAPER.page,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: PAPER.ink,
    fontFamily: PAPER_FONTS.display,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: PAPER.secondary,
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
    color: PAPER.ink,
    fontFamily: PAPER_FONTS.display,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
  },
  activeChip: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.highlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeChipText: {
    color: PAPER.ink,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  emailValue: {
    marginTop: 10,
    color: PAPER.ink,
    fontSize: 18,
    fontWeight: "500",
  },
  providerText: {
    marginTop: 4,
    color: PAPER.muted,
    fontSize: 14,
  },
  cardDescription: {
    marginTop: 8,
    color: PAPER.secondary,
    fontFamily: PAPER_FONTS.body,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.page,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  buttonText: {
    color: PAPER.ink,
    fontFamily: PAPER_FONTS.metaMedium,
    fontSize: 15,
    fontWeight: "700",
  },
});
