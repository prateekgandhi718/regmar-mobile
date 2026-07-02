import { useMemo } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountSetupGate } from "@/components/accounts/AccountSetupGate";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { FiyLogo } from "@/components/fiy-logo";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useSyncTransactionsMutation } from "@/redux/api/syncApi";
import { useGetTransactionsQuery } from "@/redux/api/transactionsApi";
import type { Transaction } from "@/lib/transactions-types";
import { withOpacity } from "@/theme/color-theme";

type DayGroup = {
  dayLabel: string;
  totalExpense: number;
  transactions: Transaction[];
};

type MonthGroup = {
  monthLabel: string;
  totalExpense: number;
  days: DayGroup[];
};

const formatAmount = (amount: number) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getEffectiveDate = (tx: Transaction) => new Date(tx.newDate || tx.originalDate);
const getEffectiveAmount = (tx: Transaction) => tx.newAmount ?? tx.originalAmount;
const isExpense = (tx: Transaction) => (tx.userType || tx.type) === "debit";

export function TransactionsScreen() {
  const { colors } = useColorTheme();
  const [syncTransactions, { isLoading: isSyncing }] = useSyncTransactionsMutation();
  const { data: linkedAccounts, isLoading: isLinkedLoading } = useGetLinkedAccountsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: transactions = [], isLoading: isTransactionsLoading } = useGetTransactionsQuery();

  const isEmailLinked = linkedAccounts?.some((acc) => acc.isActive);
  const hasAccountWithDomain = accounts.some((acc) => Array.isArray(acc.domainIds) && acc.domainIds.length > 0);

  const groupedTransactions = useMemo<MonthGroup[]>(() => {
    const monthMap = new Map<string, MonthGroup>();
    const sorted = [...transactions].sort(
      (a, b) => getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime(),
    );

    for (const tx of sorted) {
      if (tx.refunded) continue;
      const date = getEffectiveDate(tx);
      const monthLabel = date
        .toLocaleString("en-IN", { month: "short", year: "numeric" })
        .toUpperCase();
      const dayLabel = date.toLocaleString("en-IN", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const amount = getEffectiveAmount(tx);
      const expenseAmount = isExpense(tx) ? amount : 0;

      if (!monthMap.has(monthLabel)) {
        monthMap.set(monthLabel, { monthLabel, totalExpense: 0, days: [] });
      }
      const monthGroup = monthMap.get(monthLabel)!;
      monthGroup.totalExpense += expenseAmount;

      let dayGroup = monthGroup.days.find((d) => d.dayLabel === dayLabel);
      if (!dayGroup) {
        dayGroup = { dayLabel, totalExpense: 0, transactions: [] };
        monthGroup.days.push(dayGroup);
      }
      dayGroup.totalExpense += expenseAmount;
      dayGroup.transactions.push(tx);
    }

    return Array.from(monthMap.values());
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <FiyLogo size={30} color={colors.primary} />
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
              Transactions
            </Text>
          </View>
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

        <View className="flex-1 px-6 pb-32 pt-8">
          <EmailLinkGate
            title="Link your email to view transactions"
            description="Connect Gmail or iCloud to automatically pull and categorize your latest transactions."
          >
            <AccountSetupGate
              title="Add an account to start syncing"
              description="Set up at least one account and sender domains, then sync from Transactions."
              showPromptOnly
            >
              <View className="mt-6">
                {isLinkedLoading || isTransactionsLoading ? (
                  <View className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" />
                      <Text className="text-sm text-zinc-600 dark:text-zinc-300">Loading transactions...</Text>
                    </View>
                  </View>
                ) : groupedTransactions.length === 0 ? (
                  <View className="items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 dark:border-zinc-700 dark:bg-zinc-900">
                    <Text className="text-base font-semibold text-zinc-700 dark:text-zinc-200">No transactions yet</Text>
                    <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      Tap Sync after linking email and adding accounts with sender domains.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 20, paddingBottom: 24 }}
                  >
                    {groupedTransactions.map((month) => (
                      <View key={month.monthLabel} className="gap-3">
                        <View className="flex-row items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                          <Text className="text-xs font-black tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
                            {month.monthLabel}
                          </Text>
                          <Text className="text-sm font-black" style={{ color: colors.primary }}>
                            -₹{formatAmount(month.totalExpense)}
                          </Text>
                        </View>

                        {month.days.map((day) => (
                          <View key={`${month.monthLabel}-${day.dayLabel}`} className="gap-2">
                            <View className="flex-row items-center justify-between px-1">
                              <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                {day.dayLabel}
                              </Text>
                              <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                -₹{formatAmount(day.totalExpense)}
                              </Text>
                            </View>
                            {day.transactions.map((tx) => {
                              const amount = getEffectiveAmount(tx);
                              const isDebit = isExpense(tx);
                              const description = tx.newDescription || tx.originalDescription;
                              return (
                                <View
                                  key={tx.clientTxnId}
                                  className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                  <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                      <Text
                                        numberOfLines={1}
                                        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                                      >
                                        {description}
                                      </Text>
                                      <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        {tx.accountId.title}
                                        {tx.categoryId?.name ? ` • ${tx.categoryId.name}` : ""}
                                      </Text>
                                    </View>
                                    <Text
                                      className="text-sm font-bold"
                                      style={{ color: isDebit ? colors.secondary : colors.tertiary }}
                                    >
                                      {isDebit ? "-" : "+"}₹{formatAmount(amount)}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </AccountSetupGate>
          </EmailLinkGate>
        </View>
      </View>
    </SafeAreaView>
  );
}
