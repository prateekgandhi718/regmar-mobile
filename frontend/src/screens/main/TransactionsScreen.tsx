import { useMemo } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useSyncTransactionsMutation } from "@/redux/api/syncApi";
import { useGetTransactionsQuery } from "@/redux/api/transactionsApi";
import type { Transaction } from "@/lib/transactions-types";
import { getBankLogoUrl } from "@/lib/bank-logos";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const formatAmount = (amount: number) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getEffectiveDate = (tx: Transaction) => new Date(tx.newDate || tx.originalDate);
const getEffectiveAmount = (tx: Transaction) => tx.newAmount ?? tx.originalAmount;
const isDebitTransaction = (tx: Transaction) => (tx.userType || tx.type) === "debit";

const formatCardDate = (date: Date) => {
  const dateLine = date.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLine = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { dateLine, timeLine };
};

const getMerchantName = (tx: Transaction) => {
  const description = (tx.newDescription || tx.originalDescription || "Unknown Merchant").trim();
  return description;
};

export function TransactionsScreen() {
  const { colors } = useColorTheme();
  const [syncTransactions, { isLoading: isSyncing }] = useSyncTransactionsMutation();
  const { data: linkedAccounts, isLoading: isLinkedLoading } = useGetLinkedAccountsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: transactions = [], isLoading: isTransactionsLoading } = useGetTransactionsQuery();

  const isEmailLinked = linkedAccounts?.some((acc) => acc.isActive);
  const hasAccountWithDomain = accounts.some((acc) => Array.isArray(acc.domainIds) && acc.domainIds.length > 0);

  const sortedTransactions = useMemo(() => {
    return [...transactions]
      .filter((tx) => !tx.refunded)
      .sort((a, b) => getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime());
  }, [transactions]);

  const handleSync = async () => {
    if (!isEmailLinked || !hasAccountWithDomain) return;
    try {
      const result = await syncTransactions().unwrap();
      Toast.show({
        type: "success",
        text1: "Sync complete",
        text2: `${result.transactionsSynced} transactions synced`,
      });
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: apiError?.data?.message || "Could not sync transactions.",
      });
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <Text style={styles.headingText}>Transactions</Text>
          {isEmailLinked && hasAccountWithDomain ? (
            <Pressable
              onPress={handleSync}
              disabled={isSyncing}
              className="rounded-xl px-3 py-2"
              style={{
                backgroundColor: isSyncing
                  ? withOpacity(colors.primary, 0.25)
                  : withOpacity(colors.primary, 0.12),
              }}
            >
              <View className="flex-row items-center gap-2">
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={colors.primary} />
                )}
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  Sync
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 px-4 pt-6">
          {isLinkedLoading || isTransactionsLoading ? (
            <View style={styles.infoCard}>
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#D4D4D8" />
                <Text className="text-sm text-zinc-300">Loading transactions...</Text>
              </View>
            </View>
          ) : !isEmailLinked ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Email not linked</Text>
              <Text style={styles.infoDescription}>
                Link your inbox in onboarding/settings to sync transactions.
              </Text>
            </View>
          ) : !hasAccountWithDomain ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Account setup pending</Text>
              <Text style={styles.infoDescription}>
                Add at least one account with sender domains to enable syncing.
              </Text>
            </View>
          ) : sortedTransactions.length === 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>No transactions yet</Text>
              <Text style={styles.infoDescription}>Tap Sync to pull your latest transactions.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 148 }}>
              {sortedTransactions.map((tx) => {
                const amount = getEffectiveAmount(tx);
                const date = getEffectiveDate(tx);
                const { dateLine, timeLine } = formatCardDate(date);
                const isDebit = isDebitTransaction(tx);
                const merchant = getMerchantName(tx);
                const logoUrl = getBankLogoUrl(tx.domainId?.fromEmail);

                return (
                  <View
                    key={tx.clientTxnId}
                    style={styles.transactionCard}
                  >
                    <View pointerEvents="none" style={styles.glowOrbLarge} />
                    <View pointerEvents="none" style={styles.glowOrbSmall} />

                    <View className="flex-row items-start justify-between">
                      <View>
                        <Text style={styles.dateText}>{dateLine}</Text>
                        <Text style={styles.dateText}>{timeLine}</Text>
                      </View>
                      <View
                        style={[
                          styles.amountBadge,
                          styles.amountBadgeNeutral,
                        ]}
                      >
                        <Text style={styles.amountBadgeText}>
                          {isDebit ? "-" : "+"}₹{formatAmount(amount)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.titleBlock}>
                        <Text style={styles.contextLine}>{isDebit ? "Spent at" : "Received from"}</Text>
                        <Text numberOfLines={2} style={styles.merchantLine}>
                          {merchant}
                        </Text>
                        <Text style={styles.accountLine}>{tx.accountId.title}</Text>
                      </View>
                      <View style={styles.logoBadge}>
                        {logoUrl ? (
                          <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                        ) : (
                          <Text style={styles.logoFallback}>{tx.accountId.title.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
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
    color: "#F4F4F5",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  infoCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(24,24,27,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  infoTitle: {
    color: "#F4F4F5",
    fontSize: 17,
    fontWeight: "700",
  },
  infoDescription: {
    marginTop: 8,
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
  },
  transactionCard: {
    minHeight: 162,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#101013",
  },
  glowOrbLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -60,
    bottom: -80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glowOrbSmall: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 999,
    right: 36,
    top: -82,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dateText: {
    color: "#D4D4D8",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  amountBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(9,9,11,0.42)",
  },
  amountBadgeNeutral: {
    borderColor: "rgba(255,255,255,0.25)",
  },
  amountBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E4E4E7",
  },
  cardBody: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  contextLine: {
    color: "#E4E4E7",
    fontSize: 18,
    lineHeight: 24,
    fontStyle: "italic",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  merchantLine: {
    marginTop: 0,
    fontSize: 25,
    lineHeight: 29,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
    color: "#F4F4F5",
  },
  accountLine: {
    marginTop: 8,
    color: "#A1A1AA",
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  logoBadge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(9,9,11,0.44)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    color: "#F4F4F5",
    fontSize: 34,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
});
