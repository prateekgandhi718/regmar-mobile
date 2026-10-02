import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { CategoryIcon } from "@/components/category-icon";
import { EditTransactionDrawer } from "@/components/transactions/EditTransactionDrawer";
import { QuickTagDrawer } from "@/components/transactions/QuickTagDrawer";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { TransactionsInsights } from "@/components/transactions/TransactionsInsights";
import { useTiltPress } from "@/hooks/use-tilt-press";
import {
  formatAmount,
  formatCompactCurrency,
  formatDayLabel,
  formatMonthLabel,
  getEffectiveAmount,
  getEffectiveDate,
  getMerchantName,
  getSignedExpenseAmount,
  isDebitTransaction,
} from "@/components/transactions/transaction-utils";
import type { Transaction } from "@/lib/transactions-types";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { isLinkedAccountActive, useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useSyncTransactionsMutation } from "@/redux/api/syncApi";
import { useGetTransactionsQuery } from "@/redux/api/transactionsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type DayGroup = {
  dayKey: string;
  date: Date;
  total: number;
  transactions: Transaction[];
};

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  total: number;
  days: DayGroup[];
};

const FALLBACK_ICON_COLOR = PAPER.secondary;
const ICON_CHIP_SIZE = 54;
const ICON_SIZE = 24;
const formatFullCurrency = (value: number) => `₹${formatAmount(Math.abs(value))}`;


export function TransactionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [syncTransactions, { isLoading: isSyncing }] = useSyncTransactionsMutation();
  const { data: linkedAccounts, isLoading: isLinkedLoading } = useGetLinkedAccountsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: transactions = [], isLoading: isTransactionsLoading } = useGetTransactionsQuery();

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isQuickTagOpen, setIsQuickTagOpen] = useState(false);
  const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const isEmailLinked = linkedAccounts?.some((acc) => isLinkedAccountActive(acc.isActive));
  const hasAccountWithDomain = accounts.some((acc) => Array.isArray(acc.domainIds) && acc.domainIds.length > 0);

  const groupedTransactions = useMemo<MonthGroup[]>(() => {
    const sorted = [...transactions]
      .filter((tx) => !tx.refunded)
      .sort((a, b) => getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime());

    const monthMap = new Map<string, MonthGroup>();

    sorted.forEach((tx) => {
      const date = getEffectiveDate(tx);
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const day = `${date.getDate()}`.padStart(2, "0");
      const monthKey = `${year}-${month}`;
      const dayKey = `${year}-${month}-${day}`;
      const signedAmount = getSignedExpenseAmount(tx);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel: formatMonthLabel(date),
          total: 0,
          days: [],
        });
      }

      const monthGroup = monthMap.get(monthKey)!;
      monthGroup.total += signedAmount;

      const existingDayIndex = monthGroup.days.findIndex((item) => item.dayKey === dayKey);
      if (existingDayIndex === -1) {
        monthGroup.days.push({
          dayKey,
          date,
          total: signedAmount,
          transactions: [tx],
        });
      } else {
        const dayGroup = monthGroup.days[existingDayIndex];
        dayGroup.total += signedAmount;
        dayGroup.transactions.push(tx);
      }
    });

    return Array.from(monthMap.values());
  }, [transactions]);

  const handleSync = async () => {
    if (!isEmailLinked || !hasAccountWithDomain) return;
    try {
      await syncTransactions().unwrap();
    } catch (error) {
      const apiError = error as { data?: { message?: string }; error?: string };
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: apiError?.data?.message || apiError?.error || "Please try again.",
      });
    }
  };

  const closeAllDrawers = () => {
    setIsQuickTagOpen(false);
    setIsTransactionDrawerOpen(false);
    setIsEditDrawerOpen(false);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    if (transaction.categoryId) {
      setIsTransactionDrawerOpen(true);
      setIsQuickTagOpen(false);
    } else {
      setIsQuickTagOpen(true);
      setIsTransactionDrawerOpen(false);
    }
  };


  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}><Feather name="arrow-left" size={14} color={PAPER.ink} /><Text style={styles.backLabel}>BACK TO FRONT PAGE</Text></Pressable>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>THE LEDGER · A2</Text>
            <Text style={styles.headingText}>Transactions</Text>
          </View>
          {isEmailLinked && hasAccountWithDomain ? (
            <Pressable
              onPress={handleSync}
              disabled={isSyncing}
              style={[styles.syncButton, { opacity: isSyncing ? 0.55 : 1 }]}
            >
              <View style={styles.syncContent}>
                {isSyncing ? (
                  <ActivityIndicator size="small" color={PAPER.accent} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={PAPER.accent} />
                )}
                <Text style={styles.syncText}>
                  Sync
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.content}>
          {isLinkedLoading || isTransactionsLoading ? (
            <View style={styles.infoCard}>
              <View style={styles.syncContent}>
                <ActivityIndicator size="small" color={PAPER.accent} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            </View>
          ) : groupedTransactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Record one from Home to get started.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <TransactionsInsights transactions={transactions} />
              {groupedTransactions.map((monthGroup) => {
                const isMonthExpense = monthGroup.total >= 0;
                return (
                  <View key={monthGroup.monthKey} style={styles.monthSection}>
                    <View style={styles.monthHeader}>
                      <Text style={styles.monthTitle}>{monthGroup.monthLabel}</Text>
                      <Text style={[styles.monthTotal, isMonthExpense ? styles.debitText : styles.creditText]}>
                        {isMonthExpense ? "-" : "+"}
                        {formatCompactCurrency(monthGroup.total)}
                      </Text>
                    </View>

                    {monthGroup.days.map((dayGroup) => {
                      const isDayExpense = dayGroup.total >= 0;
                      return (
                        <View key={dayGroup.dayKey} style={styles.dayBlock}>
                          <View style={styles.dayHeader}>
                            <Text style={styles.dayLabel}>{formatDayLabel(dayGroup.date)}</Text>
                            <Text style={[styles.dayTotal, isDayExpense ? styles.dayExpenseText : styles.dayIncomeText]}>
                              {isDayExpense ? "-" : "+"}
                              {formatFullCurrency(dayGroup.total)}
                            </Text>
                          </View>

                          <View style={styles.dayTransactions}>
                            {dayGroup.transactions.map((transaction, index) => (
                              <View key={transaction.clientTxnId}>
                                <TransactionRow
                                  transaction={transaction}
                                  onPress={handleTransactionPress}
                                  onTagPress={(tx) => {
                                    setSelectedTransaction(tx);
                                    setIsQuickTagOpen(true);
                                    setIsTransactionDrawerOpen(false);
                                  }}
                                />
                                {index < dayGroup.transactions.length - 1 ? <View style={styles.rowSeparator} /> : null}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      <QuickTagDrawer transaction={selectedTransaction} open={isQuickTagOpen} onClose={() => setIsQuickTagOpen(false)} />

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={isTransactionDrawerOpen}
        onClose={() => setIsTransactionDrawerOpen(false)}
        onEdit={() => {
          setIsTransactionDrawerOpen(false);
          setIsEditDrawerOpen(true);
        }}
      />

      <EditTransactionDrawer
        transaction={selectedTransaction}
        open={isEditDrawerOpen}
        onClose={() => {
          closeAllDrawers();
        }}
      />
    </SafeAreaView>
  );
}

type TransactionRowProps = {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  onTagPress: (transaction: Transaction) => void;
};

function TransactionRow({ transaction, onPress, onTagPress }: TransactionRowProps) {
  const merchant = getMerchantName(transaction);
  const amount = getEffectiveAmount(transaction);
  const isDebit = isDebitTransaction(transaction);
  const iconColor = FALLBACK_ICON_COLOR;
  const iconChipBorderColor = "rgba(255,255,255,0.2)";
  const iconChipBackgroundColor = "rgba(255,255,255,0.08)";

  const { animatedStyle, onLayout, onPressIn, onPressOut } = useTiltPress();

  return (
    <Pressable onPress={() => onPress(transaction)} onPressIn={onPressIn} onPressOut={onPressOut} onLayout={onLayout}>
      <Animated.View style={[styles.transactionRow, animatedStyle]}>
        <View style={styles.rowContent}>
          {transaction.categoryId ? (
            <View style={styles.iconCell}>
              <View
                style={[
                  styles.categoryIconChip,
                  { borderColor: iconChipBorderColor, backgroundColor: iconChipBackgroundColor },
                ]}
              >
                <CategoryIcon name={transaction.categoryId.name} size={ICON_SIZE} color={iconColor} />
              </View>
            </View>
          ) : null}

          <View style={[styles.middleCell, !transaction.categoryId ? styles.middleCellNoIcon : null]}>
            <Text numberOfLines={1} style={styles.merchantLine}>
              {merchant.toUpperCase()}
            </Text>
            <Text style={styles.accountLine}>{transaction.accountId.title.toUpperCase()}</Text>
            {!transaction.categoryId ? (
              <Pressable onPress={() => onTagPress(transaction)} style={styles.tagButton}>
                <View style={styles.tagPlusWrap}>
                  <Feather name="plus" size={9} color="#18181B" />
                </View>
                <Text style={styles.tagText}>Tag</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.amountCell}>
            <Text style={[styles.amountText, isDebit ? styles.debitText : styles.creditText]}>₹{formatAmount(amount)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAPER.page },
  container: { flex: 1, backgroundColor: PAPER.page },
  backLink: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  backLabel: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 0.8 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: PAPER.hairline },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  eyebrow: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.accent, fontSize: 10, letterSpacing: 1, marginBottom: 3 },
  headingText: {
    fontSize: 38,
    lineHeight: 42,
    color: PAPER.ink,
    fontFamily: PAPER_FONTS.displayBold,
  },
  syncButton: { borderWidth: 1, borderColor: PAPER.accent, paddingHorizontal: 10, paddingVertical: 8 },
  syncContent: { flexDirection: "row", alignItems: "center", gap: 7 },
  syncText: { color: PAPER.accent, fontFamily: PAPER_FONTS.metaBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  infoCard: {
    marginTop: 8,
    borderTopWidth: 3,
    borderTopColor: PAPER.decorative,
    borderBottomWidth: 1,
    borderBottomColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  loadingText: { color: PAPER.secondary, fontFamily: PAPER_FONTS.body, fontSize: 14 },
  emptyWrap: {
    marginTop: 24,
    borderTopWidth: 3,
    borderTopColor: PAPER.decorative,
    borderBottomWidth: 1,
    borderBottomColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  emptyTitle: {
    color: PAPER.ink,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: PAPER_FONTS.display,
  },
  emptySubtitle: {
    color: PAPER.secondary,
    fontFamily: PAPER_FONTS.body,
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    gap: 24,
    paddingBottom: 32,
  },
  monthSection: {
    gap: 12,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
    borderTopWidth: 3,
    borderTopColor: PAPER.decorative,
    paddingTop: 10,
  },
  monthTitle: {
    color: PAPER.ink,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: PAPER_FONTS.display,
    letterSpacing: 1.2,
  },
  monthTotal: {
    fontSize: 18,
    fontFamily: PAPER_FONTS.metaBold,
    color: PAPER.accent,
  },
  dayBlock: {
    gap: 10,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dayLabel: {
    color: PAPER.secondary,
    fontSize: 15,
    fontFamily: PAPER_FONTS.metaMedium,
  },
  dayTotal: {
    fontSize: 16,
    fontFamily: PAPER_FONTS.metaBold,
  },
  dayExpenseText: {
    color: PAPER.accent,
  },
  dayIncomeText: {
    color: PAPER.blueInk,
  },
  dayTransactions: {
    gap: 8,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: PAPER.hairline,
    marginVertical: 8,
    marginHorizontal: 8,
  },
  transactionRow: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 11,
    shadowOpacity: 0,
    elevation: 0,
  },
  rowContent: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
  },
  iconCell: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconChip: {
    width: ICON_CHIP_SIZE,
    height: ICON_CHIP_SIZE,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.highlight,
    alignItems: "center",
    justifyContent: "center",
  },
  middleCell: {
    flex: 1,
    gap: 4,
    minHeight: 54,
    justifyContent: "center",
  },
  middleCellNoIcon: {
    paddingLeft: 2,
  },
  merchantLine: {
    color: PAPER.ink,
    fontFamily: PAPER_FONTS.bodyMedium,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: 0.25,
  },
  accountLine: {
    color: PAPER.muted,
    fontFamily: PAPER_FONTS.metaMedium,
    fontSize: 12,
    letterSpacing: 0.9,
    fontWeight: "700",
  },
  tagButton: {
    marginTop: 3,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PAPER.highlight,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPlusWrap: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: PAPER.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    color: PAPER.ink,
    fontSize: 12,
    fontFamily: PAPER_FONTS.metaMedium,
  },
  amountCell: {
    minWidth: 112,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amountText: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: PAPER_FONTS.display,
    letterSpacing: 0.1,
  },
  debitText: {
    color: PAPER.accent,
  },
  creditText: {
    color: PAPER.blueInk,
  },
});
