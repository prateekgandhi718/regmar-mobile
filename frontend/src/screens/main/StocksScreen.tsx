import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { getStockLogoUrl } from "@/lib/investment-logos";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetMyInvestmentsQuery } from "@/redux/api/investmentsApi";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type MetricTone = "default" | "highlight";

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const formatSummaryValue = (value: number) => {
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${Math.round(value)}`;
};

function MetricRow({ label, value, tone = "default", fullWidth = false }: { label: string; value: string; tone?: MetricTone; fullWidth?: boolean }) {
  return (
    <View style={[styles.metricCell, fullWidth ? styles.metricCellWide : null]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.metricValue, tone === "highlight" ? styles.metricHighlight : null]}>
        {value}
      </Text>
    </View>
  );
}

function StockCard({
  stock,
}: {
  stock: {
    name: string;
    ticker: string;
    isin: string;
    isEtf: boolean;
    freeBalance: number;
    marketPrice: number;
    currentValue: number;
    currentPercentage: number;
  };
}) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = logoError ? null : getStockLogoUrl(stock.isin);

  return (
    <View style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View style={styles.stockTitleWrap}>
          <View style={styles.logoShell}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} resizeMode="contain" style={styles.logoImage} onError={() => setLogoError(true)} />
            ) : (
              <Text style={styles.logoFallbackText}>{(stock.ticker || stock.name || "ST").slice(0, 2).toUpperCase()}</Text>
            )}
          </View>

          <View style={styles.stockTitleCopy}>
            <Text numberOfLines={2} style={styles.stockTitle}>
              {stock.name || stock.ticker || stock.isin}
            </Text>
            <Text numberOfLines={1} style={styles.stockSubtitle}>
              {stock.ticker || "-"}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Feather name={stock.isEtf ? "layers" : "trending-up"} size={10} color="#E4E4E7" />
                <Text style={styles.badgeText}>{stock.isEtf ? "ETF" : "Stock"}</Text>
              </View>
              {!stock.isEtf && stock.currentPercentage > 0 ? (
                <View style={styles.badge}>
                  <Feather name="pie-chart" size={10} color="#A1A1AA" />
                  <Text style={styles.badgeText}>{stock.currentPercentage.toFixed(2)}%</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricRow label="Quantity" value={stock.freeBalance.toString()} />
        <MetricRow label="Market Price" value={formatCurrency(stock.marketPrice)} />
        <MetricRow label="Current Value" value={formatCurrency(stock.currentValue)} tone="highlight" />
        <MetricRow label="Holding Value" value={formatCurrency(stock.currentValue)} tone="highlight" />
      </View>
    </View>
  );
}

export function StocksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useColorTheme();
  const { data, isLoading } = useGetMyInvestmentsQuery();

  const stocks = data?.stocks || [];

  const summary = useMemo(() => {
    const total = stocks.reduce((sum, stock) => sum + stock.currentValue, 0);
    const etfCount = stocks.filter((stock) => stock.isEtf).length;
    const stockCount = stocks.length - etfCount;
    return { total, etfCount, stockCount };
  }, [stocks]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <View className="flex-1 px-6 pt-4">
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={18} color="#E4E4E7" />
            </Pressable>
            <View>
              <Text style={[styles.headerTitle, { color: colors.primary }]}>Stocks</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#D4D4D8" />
            <Text style={styles.loadingText}>Loading stocks...</Text>
          </View>
        ) : stocks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="bar-chart-2" size={22} color={withOpacity(colors.primary, 0.6)} />
            <Text style={styles.emptyTitle}>No stocks yet</Text>
            <Text style={styles.emptyDescription}>Sync from Investments to fetch your latest stock holdings.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.summaryShell}>
              <View style={styles.summaryGlowA} />
              <View style={styles.summaryGlowB} />
              <LinearGradient colors={["rgba(24,24,27,0.96)", "rgba(9,9,11,1)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Equity Value</Text>
                  <Text style={[styles.summaryAmount, { color: colors.primary }]}>{formatSummaryValue(summary.total)}</Text>
                  <View style={styles.summaryChipRow}>
                    <View style={styles.summaryChip}>
                      <Feather name="trending-up" size={12} color="#E4E4E7" />
                      <Text style={styles.summaryChipText}>{summary.stockCount} Stocks</Text>
                    </View>
                    <View style={styles.summaryChip}>
                      <Feather name="layers" size={12} color="#E4E4E7" />
                      <Text style={styles.summaryChipText}>{summary.etfCount} ETFs</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {stocks.map((stock) => (
              <StockCard
                key={stock.isin}
                stock={{
                  name: stock.name,
                  ticker: stock.ticker,
                  isin: stock.isin,
                  isEtf: stock.isEtf,
                  freeBalance: stock.freeBalance,
                  marketPrice: stock.marketPrice,
                  currentValue: stock.currentValue,
                  currentPercentage: stock.currentPercentage,
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
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
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(24,24,27,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "700",
  },
  loadingCard: {
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111113",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  loadingText: {
    color: "#D4D4D8",
    fontSize: 14,
  },
  emptyCard: {
    marginTop: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "#111113",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 44,
  },
  emptyTitle: {
    marginTop: 12,
    color: "#F4F4F5",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDescription: {
    marginTop: 8,
    textAlign: "center",
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 140,
    gap: 14,
  },
  summaryShell: {
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "#09090B",
  },
  summaryGlowA: {
    position: "absolute",
    top: -36,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(126,166,255,0.2)",
  },
  summaryGlowB: {
    position: "absolute",
    top: 30,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(105,227,176,0.15)",
  },
  summaryCard: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  summaryLabel: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  summaryAmount: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  summaryChipRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  summaryChipText: {
    color: "#D4D4D8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stockCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "#101014",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  stockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stockTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  logoShell: {
    width: 52,
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  logoFallbackText: {
    color: "#E4E4E7",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  stockTitleCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 2,
  },
  stockTitle: {
    color: "#F4F4F5",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  stockSubtitle: {
    color: "#8F9099",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeRow: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#E4E4E7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  metricCell: {
    width: "50%",
    paddingRight: 8,
    gap: 4,
  },
  metricCellWide: {
    width: "100%",
  },
  metricLabel: {
    color: "#71717A",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricValue: {
    color: "#D4D4D8",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  metricHighlight: {
    color: "#F4F4F5",
  },
});
