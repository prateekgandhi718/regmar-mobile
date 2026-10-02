import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Transaction } from "@/lib/transactions-types";
import { EditorialGroupedBarChart, type GroupedBarDatum } from "@/components/newspaper/charts";
import { ChartFrame } from "@/components/newspaper";
import {
  formatAmount,
  getEffectiveAmount,
  getEffectiveDate,
  isExpenseTransaction,
  isInvestment,
} from "@/components/transactions/transaction-utils";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type TransactionsInsightsProps = { transactions: Transaction[] };
type DateRangeFilter = "30d" | "6m" | "12m" | "all";
type MonthPoint = { label: string; fullLabel: string; monthYear: string; expenses: number; investments: number };

const monthKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
const formatCompactNoCurrency = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(absolute / 1_000_000).toFixed(absolute % 1_000_000 === 0 ? 0 : 1)}M`;
  if (absolute >= 1_000) return `${(absolute / 1_000).toFixed(absolute % 1_000 === 0 ? 0 : 1)}K`;
  return Math.round(absolute).toString();
};

function getMonthSeries(transactions: Transaction[]): MonthPoint[] {
  const txs = transactions.filter((tx) => !tx.refunded);
  if (!txs.length) return [];
  const sorted = [...txs].sort((a, b) => getEffectiveDate(a).getTime() - getEffectiveDate(b).getTime());
  const cursor = new Date(getEffectiveDate(sorted[0]).getFullYear(), getEffectiveDate(sorted[0]).getMonth(), 1);
  const end = new Date(getEffectiveDate(sorted[sorted.length - 1]).getFullYear(), getEffectiveDate(sorted[sorted.length - 1]).getMonth(), 1);
  const months: Date[] = [];
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.map((date) => {
    let expenses = 0;
    let investments = 0;
    txs.forEach((tx) => {
      if (monthKey(getEffectiveDate(tx)) !== monthKey(date)) return;
      const amount = getEffectiveAmount(tx);
      if (isInvestment(tx)) investments += amount;
      else if (isExpenseTransaction(tx)) expenses += amount;
    });
    return {
      label: date.toLocaleDateString("en-IN", { month: "short" }).slice(0, 3).toUpperCase(),
      fullLabel: date.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase(),
      monthYear: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }).toUpperCase(),
      expenses: Math.round(expenses),
      investments: Math.round(investments),
    };
  });
}

export function TransactionsInsights({ transactions }: TransactionsInsightsProps) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (dateRange === "all") return transactions;
    const start = new Date(now);
    if (dateRange === "30d") start.setDate(now.getDate() - 30);
    else if (dateRange === "6m") start.setMonth(now.getMonth() - 6);
    else start.setMonth(now.getMonth() - 12);
    return transactions.filter((tx) => getEffectiveDate(tx).getTime() >= start.getTime());
  }, [dateRange, transactions]);

  const monthSeries = useMemo(() => getMonthSeries(filteredTransactions), [filteredTransactions]);
  const selectedData = useMemo(() => {
    let totalExpenses = 0;
    let totalInvestments = 0;
    const categories = new Map<string, number>();
    filteredTransactions.forEach((tx) => {
      if (tx.refunded) return;
      const amount = getEffectiveAmount(tx);
      if (isInvestment(tx)) totalInvestments += amount;
      else if (isExpenseTransaction(tx)) {
        totalExpenses += amount;
        if (tx.categoryId?.name) categories.set(tx.categoryId.name, (categories.get(tx.categoryId.name) || 0) + amount);
      }
    });
    return {
      avgExpenses: monthSeries.length ? totalExpenses / monthSeries.length : 0,
      avgInvestments: monthSeries.length ? totalInvestments / monthSeries.length : 0,
      rangeLabel: monthSeries.length > 1 ? `${monthSeries[0].monthYear} – ${monthSeries[monthSeries.length - 1].monthYear}` : monthSeries[0]?.monthYear || "",
      categories: Array.from(categories.entries()).map(([name, amount]) => ({ name, amount, percent: totalExpenses ? (amount / totalExpenses) * 100 : 0 })),
    };
  }, [filteredTransactions, monthSeries]);

  const groupedData = useMemo<GroupedBarDatum[]>(() => monthSeries.map((point) => ({
    label: point.label,
    values: [
      { label: "Expense", value: point.expenses },
      { label: "Investment", value: point.investments, highlight: true },
    ],
  })), [monthSeries]);

  if (!monthSeries.length) return null;

  return (
    <ChartFrame title="The monthly ledger" description="Expense and investment movement by month" number="FIG. 02 / COMPARISON" source="Your recorded transactions">
      <View style={styles.filterRow}>
        {[{ key: "30d", label: "30D" }, { key: "6m", label: "6M" }, { key: "12m", label: "12M" }, { key: "all", label: "ALL TIME" }].map((item) => (
          <Pressable key={item.key} onPress={() => setDateRange(item.key as DateRangeFilter)} style={[styles.filter, dateRange === item.key ? styles.filterActive : null]}>
            <Text style={[styles.filterText, dateRange === item.key ? styles.filterTextActive : null]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.averageRow}>
        <View><Text style={styles.eyebrow}>MONTH AVERAGE</Text><Text style={styles.range}>{selectedData.rangeLabel}</Text></View>
        <View style={styles.averageValues}><Text style={styles.expense}>−₹{formatCompactNoCurrency(selectedData.avgExpenses)}</Text><Text style={styles.investment}>₹{formatCompactNoCurrency(selectedData.avgInvestments)}</Text></View>
      </View>
      <EditorialGroupedBarChart label="Monthly expenses and investments" data={groupedData} unit="INR" />
      <View style={styles.legendRow}><View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: PAPER.ink }]} /><Text style={styles.legend}>Expense</Text></View><View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: PAPER.secondary }]} /><Text style={styles.legend}>Investment</Text></View></View>
      {selectedData.categories.length ? <View style={styles.categorySection}><View style={styles.splitBar}>{selectedData.categories.map((category, index) => <View key={category.name} style={[styles.splitSegment, { width: `${Math.max(category.percent, 3)}%`, backgroundColor: index === 0 ? PAPER.ink : index % 2 === 0 ? PAPER.secondary : PAPER.muted }]} />)}</View><View style={styles.categoryLegend}>{selectedData.categories.map((category) => <Text key={category.name} style={styles.categoryText}>{category.name} {Math.round(category.percent)}%</Text>)}</View></View> : null}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  filter: { borderWidth: 1, borderColor: PAPER.hairline, paddingHorizontal: 9, paddingVertical: 6 },
  filterActive: { backgroundColor: PAPER.ink, borderColor: PAPER.ink },
  filterText: { fontFamily: PAPER_FONTS.metaMedium, color: PAPER.secondary, fontSize: 10, letterSpacing: 0.6 },
  filterTextActive: { color: PAPER.page },
  averageRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingBottom: 12, marginBottom: 12 },
  eyebrow: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.secondary, fontSize: 10, letterSpacing: 0.8 },
  range: { fontFamily: PAPER_FONTS.display, color: PAPER.ink, fontSize: 20, marginTop: 2 },
  averageValues: { alignItems: "flex-end", gap: 2 },
  expense: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.ink, fontSize: 12 },
  investment: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.secondary, fontSize: 12 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legend: { fontFamily: PAPER_FONTS.meta, color: PAPER.secondary, fontSize: 11 },
  dot: { width: 8, height: 8, marginRight: 5 },
  categorySection: { marginTop: 18 },
  splitBar: { height: 10, flexDirection: "row", backgroundColor: PAPER.hairline },
  splitSegment: { height: "100%" },
  categoryLegend: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  categoryText: { fontFamily: PAPER_FONTS.meta, color: PAPER.secondary, fontSize: 10 },
});
