import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { CategoryIcon } from "@/components/category-icon";
import { useColorTheme } from "@/components/providers/color-theme-provider";
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
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

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

const FALLBACK_ICON_COLOR = "#D4D4D8";
const ICON_CHIP_SIZE = 54;
const ICON_SIZE = 24;
const formatFullCurrency = (value: number) => `₹${formatAmount(Math.abs(value))}`;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;
  if (full.length !== 6) return `rgba(212,212,216,${alpha})`;

  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const getNeedAccent = (transaction: Transaction) => transaction.needSelection?.color || FALLBACK_ICON_COLOR;

export function TransactionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useColorTheme();
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

  const handleNeedCheckIn = (transaction: Transaction) => {
    const amount = getEffectiveAmount(transaction);
    const merchant = getMerchantName(transaction);
    const date = getEffectiveDate(transaction);
    const isDebit = isDebitTransaction(transaction);

    navigation.navigate("TransactionNeedCheckIn", {
      transaction: {
        clientTxnId: transaction.clientTxnId,
        merchant,
        amount,
        type: isDebit ? "debit" : "credit",
        date: date.toISOString(),
        needSelection: transaction.needSelection,
        categoryName: transaction.categoryId?.name,
        accountTitle: transaction.accountId?.title,
      },
    });
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
                backgroundColor: isSyncing ? withOpacity(colors.primary, 0.25) : withOpacity(colors.primary, 0.12),
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

        <View className="flex-1 px-6 pt-6">
          {isLinkedLoading || isTransactionsLoading ? (
            <View style={styles.infoCard}>
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#D4D4D8" />
                <Text className="text-sm text-zinc-300">Loading transactions...</Text>
              </View>
            </View>
          ) : groupedTransactions.length === 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>No transactions yet</Text>
              <Text style={styles.infoDescription}>Record one from Home to get started.</Text>
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
        onNeedCheckIn={handleNeedCheckIn}
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
  const iconColor = getNeedAccent(transaction);
  const iconChipBorderColor = transaction.needSelection?.color ? hexToRgba(iconColor, 0.48) : "rgba(255,255,255,0.2)";
  const iconChipBackgroundColor = transaction.needSelection?.color ? hexToRgba(iconColor, 0.16) : "rgba(255,255,255,0.08)";

  const { animatedStyle, onLayout, onPressIn, onPressOut } = useTiltPress();

  return (
    <Pressable onPress={() => onPress(transaction)} onPressIn={onPressIn} onPressOut={onPressOut} onLayout={onLayout}>
      <Animated.View style={[styles.transactionRow, animatedStyle]}>
        {transaction.needSelection?.color ? <NeedTintOverlay color={transaction.needSelection.color} /> : null}
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

type NeedTintOverlayProps = {
  color: string;
};

function NeedTintOverlay({ color }: NeedTintOverlayProps) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[hexToRgba(color, 0.26), hexToRgba(color, 0.11), "rgba(0,0,0,0)"]}
      locations={[0, 0.36, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.gradientOverlay}
    />
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
  scrollContent: {
    gap: 20,
    paddingBottom: 140,
  },
  monthSection: {
    gap: 10,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  monthTitle: {
    color: "#A1A1AA",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  monthTotal: {
    fontSize: 18,
    fontWeight: "800",
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
    color: "#A1A1AA",
    fontSize: 15,
    fontWeight: "700",
  },
  dayTotal: {
    fontSize: 16,
    fontWeight: "800",
  },
  dayExpenseText: {
    color: "#B0B0B4",
  },
  dayIncomeText: {
    color: "#86EFAC",
  },
  dayTransactions: {
    gap: 8,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 8,
    marginHorizontal: 8,
  },
  transactionRow: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0F1016",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 11,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  rowContent: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  iconCell: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconChip: {
    width: ICON_CHIP_SIZE,
    height: ICON_CHIP_SIZE,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.09)",
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
    color: "#F4F4F5",
    fontFamily: "System",
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: 0.25,
  },
  accountLine: {
    color: "#8F9099",
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
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPlusWrap: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#D4D4D8",
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    color: "#E4E4E7",
    fontSize: 12,
    fontWeight: "700",
  },
  amountCell: {
    minWidth: 112,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amountText: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  debitText: {
    color: "#F4F4F5",
  },
  creditText: {
    color: "#A7F3D0",
  },
});
