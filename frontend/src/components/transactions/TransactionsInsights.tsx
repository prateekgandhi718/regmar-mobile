import { useMemo, useState } from "react";
import { BarChart, type barDataItem } from "react-native-gifted-charts";
import { StyleSheet, Text, Pressable, View } from "react-native";
import type { Transaction } from "@/lib/transactions-types";
import {
  formatAmount,
  getEffectiveAmount,
  getEffectiveDate,
  isExpenseTransaction,
  isInvestment,
} from "@/components/transactions/transaction-utils";

type TransactionsInsightsProps = {
  transactions: Transaction[];
};

const EXPENSE_COLOR = "#E56A53";
const INVESTMENT_COLOR = "#63AEE8";
const CATEGORY_COLORS = ["#67C36B", "#A0BE58", "#58A0D1", "#E5C558", "#A062D7", "#6464D8", "#FF2E63", "#8D93FF"];

type DateRangeFilter = "30d" | "6m" | "12m" | "all";

type MonthPoint = {
  label: string;
  fullLabel: string;
  monthYear: string;
  expenses: number;
  investments: number;
  total: number;
};

const monthKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;

const formatCompactNoCurrency = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(absolute / 1_000_000).toFixed(absolute % 1_000_000 === 0 ? 0 : 1)}M`;
  if (absolute >= 1_000) return `${(absolute / 1_000).toFixed(absolute % 1_000 === 0 ? 0 : 1)}K`;
  return Math.round(absolute).toString();
};

const getMonthSeries = (transactions: Transaction[]): MonthPoint[] => {
  const txs = transactions.filter((tx) => !tx.refunded);
  if (!txs.length) return [];

  const sorted = [...txs].sort((a, b) => getEffectiveDate(a).getTime() - getEffectiveDate(b).getTime());
  const start = getEffectiveDate(sorted[0]);
  const end = getEffectiveDate(sorted[sorted.length - 1]);
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  const months: Date[] = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.map((date) => {
    let expenses = 0;
    let investments = 0;
    const key = monthKey(date);

    txs.forEach((tx) => {
      const txDate = getEffectiveDate(tx);
      if (monthKey(txDate) !== key) return;

      const amount = getEffectiveAmount(tx);
      if (isInvestment(tx)) {
        investments += amount;
      } else if (isExpenseTransaction(tx)) {
        expenses += amount;
      }
    });

    return {
      label: date.toLocaleDateString("en-IN", { month: "short" }).charAt(0).toUpperCase(),
      fullLabel: date.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase(),
      monthYear: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }).toUpperCase(),
      expenses: Math.round(expenses),
      investments: Math.round(investments),
      total: Math.round(expenses + investments),
    };
  });
};

export function TransactionsInsights({ transactions }: TransactionsInsightsProps) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (dateRange === "all") return transactions;

    const rangeStart = new Date(now);
    if (dateRange === "30d") {
      rangeStart.setDate(now.getDate() - 30);
    } else if (dateRange === "6m") {
      rangeStart.setMonth(now.getMonth() - 6);
    } else {
      rangeStart.setMonth(now.getMonth() - 12);
    }

    return transactions.filter((tx) => getEffectiveDate(tx).getTime() >= rangeStart.getTime());
  }, [transactions, dateRange]);

  const monthSeries = useMemo(() => getMonthSeries(filteredTransactions), [filteredTransactions]);

  const selectedData = useMemo(() => {
    if (!monthSeries.length) {
      return {
        avgExpenses: 0,
        avgInvestments: 0,
        rangeLabel: "",
        categories: [] as Array<{ name: string; amount: number; percent: number; color: string }>,
        needs: [] as Array<{ key: string; label: string; amount: number; percent: number; color: string }>,
      };
    }

    const monthKeys = new Set(monthSeries.map((item) => item.fullLabel));
    let totalExpenses = 0;
    let totalInvestments = 0;
    let totalNeedsAmount = 0;
    const categoryTotals = new Map<string, number>();
    const needTotals = new Map<string, { label: string; color: string; amount: number }>();

    filteredTransactions.forEach((tx) => {
      if (tx.refunded) return;
      const txMonth = getEffectiveDate(tx).toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase();
      if (!monthKeys.has(txMonth)) return;

      const amount = getEffectiveAmount(tx);
      if (tx.needSelection?.key && tx.needSelection?.label && tx.needSelection?.color) {
        totalNeedsAmount += amount;
        const current = needTotals.get(tx.needSelection.key);
        if (current) {
          current.amount += amount;
        } else {
          needTotals.set(tx.needSelection.key, {
            label: tx.needSelection.label,
            color: tx.needSelection.color,
            amount,
          });
        }
      }

      if (isInvestment(tx)) {
        totalInvestments += amount;
        return;
      }
      if (!isExpenseTransaction(tx)) return;

      totalExpenses += amount;

      if (tx.categoryId?.name) {
        categoryTotals.set(tx.categoryId.name, (categoryTotals.get(tx.categoryId.name) || 0) + amount);
      }
    });

    const categories = Array.from(categoryTotals.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        percent: totalExpenses ? (amount / totalExpenses) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    const needs = Array.from(needTotals.entries())
      .map(([key, item]) => ({
        key,
        label: item.label,
        amount: item.amount,
        percent: totalNeedsAmount ? (item.amount / totalNeedsAmount) * 100 : 0,
        color: item.color,
      }))
      .sort((a, b) => b.amount - a.amount);

    const avgExpenses = totalExpenses / (monthSeries.length || 1);
    const avgInvestments = totalInvestments / (monthSeries.length || 1);
    const rangeLabel =
      monthSeries.length > 1
        ? `${monthSeries[0].monthYear} - ${monthSeries[monthSeries.length - 1].monthYear}`
        : monthSeries[0].monthYear;

    return { avgExpenses, avgInvestments, rangeLabel, categories, needs };
  }, [monthSeries, filteredTransactions]);

  const chartData = useMemo<barDataItem[]>(
    () =>
      monthSeries.flatMap((point) => [
        {
          value: point.expenses,
          frontColor: EXPENSE_COLOR,
          label: "",
          spacing: 4,
          barBorderTopLeftRadius: 5,
          barBorderTopRightRadius: 5,
        },
        {
          value: point.investments,
          frontColor: INVESTMENT_COLOR,
          label: point.label,
          spacing: 16,
          barBorderTopLeftRadius: 5,
          barBorderTopRightRadius: 5,
        },
      ]),
    [monthSeries],
  );

  const maxTotal = useMemo(
    () => Math.max(...monthSeries.map((point) => Math.max(point.expenses, point.investments)), 0),
    [monthSeries],
  );
  const roundedMax = useMemo(() => {
    if (!maxTotal) return 10_000;
    const scale = maxTotal > 100_000 ? 10_000 : 5_000;
    return Math.ceil(maxTotal / scale) * scale;
  }, [maxTotal]);

  const yAxisLabelTexts = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5].map((index) => {
        const value = (roundedMax / 5) * index;
        return `${Math.round(value / 1000)}K`;
      }),
    [roundedMax],
  );

  if (!monthSeries.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.filterRow}>
        {[
          { key: "30d", label: "30D" },
          { key: "6m", label: "6M" },
          { key: "12m", label: "12M" },
          { key: "all", label: "All Time" },
        ].map((item) => {
          const active = dateRange === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setDateRange(item.key as DateRangeFilter)}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Month Average</Text>
        <Text style={styles.range}>{selectedData.rangeLabel}</Text>
        <View style={styles.avgRow}>
          <Text style={styles.avgExpense}>
            -₹{formatCompactNoCurrency(selectedData.avgExpenses)}
            {dateRange === "all" || dateRange === "6m" || dateRange === "12m" ? "/mth" : ""}
          </Text>
          <Text style={styles.avgInvestment}>
            ₹{formatCompactNoCurrency(selectedData.avgInvestments)}
            {dateRange === "all" || dateRange === "6m" || dateRange === "12m" ? "/mth" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.chartWrap}>
        <BarChart
          data={chartData}
          height={230}
          noOfSections={5}
          maxValue={roundedMax}
          barWidth={10}
          spacing={8}
          initialSpacing={6}
          endSpacing={6}
          roundedTop
          roundedBottom={false}
          xAxisColor="rgba(255,255,255,0.18)"
          yAxisColor="transparent"
          yAxisTextStyle={styles.yAxisText}
          xAxisLabelTextStyle={styles.xAxisText}
          hideYAxisText={false}
          yAxisLabelTexts={yAxisLabelTexts}
          showVerticalLines
          verticalLinesColor="rgba(255,255,255,0.14)"
          verticalLinesThickness={1}
          rulesColor="rgba(255,255,255,0.14)"
          rulesThickness={1}
          dashWidth={2}
          dashGap={4}
          rulesType="dashed"
          xAxisThickness={1}
          disablePress
          disableScroll
        />
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: EXPENSE_COLOR }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: INVESTMENT_COLOR }]} />
          <Text style={styles.legendText}>Investment</Text>
        </View>
      </View>

      {selectedData.categories.length ? (
        <View style={styles.section}>
          <View style={styles.splitBar}>
            {selectedData.categories.map((category) => (
              <View
                key={category.name}
                style={[styles.splitSegment, { width: `${Math.max(category.percent, 3)}%`, backgroundColor: category.color }]}
              />
            ))}
          </View>
          <View style={styles.categoryLegendWrap}>
            {selectedData.categories.map((category) => (
              <View key={category.name} style={styles.categoryLegendItem}>
                <View style={[styles.legendDotSmall, { backgroundColor: category.color }]} />
                <Text style={styles.splitLegendName}>{category.name}</Text>
                <Text style={styles.splitLegendPercent}>{Math.round(category.percent)}%</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {selectedData.needs.length ? (
        <View style={styles.section}>
          <View style={styles.splitBar}>
            {selectedData.needs.map((need) => (
              <View
                key={need.key}
                style={[styles.splitSegment, { width: `${Math.max(need.percent, 3)}%`, backgroundColor: need.color }]}
              />
            ))}
          </View>
          <View style={styles.categoryLegendWrap}>
            {selectedData.needs.map((need) => (
              <View key={need.key} style={styles.categoryLegendItem}>
                <View style={[styles.legendDotSmall, { backgroundColor: need.color }]} />
                <Text style={styles.splitLegendName}>{need.label}</Text>
                <Text style={styles.splitLegendPercent}>{Math.round(need.percent)}%</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101114",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  filterChipText: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#F4F4F5",
  },
  headerBlock: {
    gap: 4,
  },
  eyebrow: {
    color: "#8E8E95",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  range: {
    color: "#F4F4F5",
    fontSize: 22,
    fontWeight: "800",
  },
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 2,
  },
  avgExpense: {
    color: "#E56A53",
    fontSize: 15,
    fontWeight: "800",
  },
  avgInvestment: {
    color: "#63AEE8",
    fontSize: 15,
    fontWeight: "800",
  },
  chartWrap: {
    marginTop: 4,
  },
  xAxisText: {
    color: "#8E8E95",
    fontSize: 12,
    fontWeight: "700",
  },
  yAxisText: {
    color: "#8E8E95",
    fontSize: 11,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  splitBar: {
    height: 18,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
  },
  splitSegment: {
    height: "100%",
  },
  splitLegendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  splitLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  legendDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  splitLegendName: {
    color: "#E4E4E7",
    fontSize: 12,
    fontWeight: "700",
  },
  splitLegendPercent: {
    color: "#8E8E95",
    fontSize: 12,
    fontWeight: "700",
  },
  categoryLegendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
});
