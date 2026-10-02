import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Factbox, Folio, Headline, Masthead, NewspaperLayout, PaperButton, Rule, Subhead } from "@/components/newspaper";
import { getStockLogoUrl } from "@/lib/investment-logos";
import type { Stock } from "@/lib/investments-types";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetMyInvestmentsQuery, useOptimizeUltimatePortfolioMutation } from "@/redux/api/investmentsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatCurrency = (value: number) => {
  const numeric = Number(value) || 0;
  if (Math.abs(numeric) >= 10000000) return `₹${(numeric / 10000000).toFixed(2)}Cr`;
  if (Math.abs(numeric) >= 100000) return `₹${(numeric / 100000).toFixed(2)}L`;
  return `₹${Math.round(numeric).toLocaleString("en-IN")}`;
};

function StockRow({ stock, optimizedPercentage }: { stock: Stock; optimizedPercentage?: number }) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = logoError ? null : getStockLogoUrl(stock.isin);
  const ticker = stock.ticker || stock.name || stock.isin || "—";
  return (
    <View style={styles.stockRow}>
      <View style={styles.stockHeading}>
        <View style={styles.logoBadge}>
          {logoUrl ? <Image source={{ uri: logoUrl }} resizeMode="contain" style={styles.logoImage} onError={() => setLogoError(true)} /> : <Text style={styles.logoFallback}>{ticker.slice(0, 2).toUpperCase()}</Text>}
        </View>
        <View style={styles.stockCopy}>
          <Text style={styles.ticker}>{ticker}</Text>
          <Text numberOfLines={2} style={styles.stockName}>{stock.name || "Unnamed security"}</Text>
          <Text style={styles.stockMeta}>{stock.isEtf ? "ETF" : "EQUITY"} · {stock.freeBalance} shares</Text>
        </View>
        <View style={styles.stockValue}>
          <Text style={styles.value}>{formatCurrency(stock.currentValue)}</Text>
          <Text style={styles.valueMeta}>{Number(stock.currentPercentage || 0).toFixed(1)}% of equity</Text>
        </View>
      </View>
      <View style={styles.stockDataRow}>
        <View><Text style={styles.dataLabel}>MARKET PRICE</Text><Text style={styles.dataValue}>{formatCurrency(stock.marketPrice)}</Text></View>
        <View><Text style={styles.dataLabel}>FREE BALANCE</Text><Text style={styles.dataValue}>{stock.freeBalance}</Text></View>
        {optimizedPercentage !== undefined ? <View><Text style={styles.dataLabel}>SUGGESTED</Text><Text style={styles.dataValue}>{optimizedPercentage.toFixed(1)}%</Text></View> : null}
      </View>
    </View>
  );
}

export function StocksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading } = useGetMyInvestmentsQuery();
  const [optimizePortfolio, { data: optimizedData, isLoading: isOptimizing }] = useOptimizeUltimatePortfolioMutation();
  const stocks = useMemo(() => (Array.isArray(data?.stocks) ? data.stocks : []), [data?.stocks]);
  const total = stocks.reduce((sum, stock) => sum + Number(stock.currentValue || 0), 0);
  const stockCount = stocks.filter((stock) => !stock.isEtf).length;
  const etfCount = stocks.filter((stock) => stock.isEtf).length;

  const handleOptimize = async () => {
    const tickers = stocks.filter((stock) => !stock.isEtf && !!stock.ticker).map((stock) => stock.ticker);
    if (!tickers.length) return;
    await optimizePortfolio({ tickers }).unwrap().catch(() => undefined);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <NewspaperLayout scroll>
        <Masthead title="STOCKS" edition="Vol. I · No. 2" date={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        <Folio page="A2" section="EQUITIES" publication="MOCO" date="CURRENT EDITION" />
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}><Feather name="arrow-left" size={14} color={PAPER.ink} /><Text style={styles.backLabel}>BACK TO INVESTMENTS</Text></Pressable>

        {isLoading ? <View style={styles.loading}><ActivityIndicator color={PAPER.ink} /><Text style={styles.loadingText}>Reading the statement...</Text></View> : stocks.length === 0 ? (
          <Factbox title="No equity holdings" style={styles.emptyBox}><Text style={styles.bodyText}>Sync a CAS statement from Investments to populate the equity desk.</Text></Factbox>
        ) : (
          <>
            <Headline>Names in the ledger.</Headline>
            <Subhead>Listed securities and exchange-traded funds, arranged by current holding value.</Subhead>
            <View style={styles.totalBlock}><Text style={styles.eyebrow}>TOTAL EQUITY VALUE</Text><Text style={styles.totalValue}>{formatCurrency(total)}</Text><Text style={styles.totalNote}>{stockCount} stocks · {etfCount} ETFs</Text></View>
            <View style={styles.actionRow}><PaperButton variant="quiet" onPress={handleOptimize} loading={isOptimizing}>Optimize portfolio</PaperButton></View>
            {optimizedData?.metrics ? <Factbox title="Optimization note" style={styles.metricsBox}><View style={styles.metricsRow}><Text style={styles.metricsText}>Expected return {((optimizedData.metrics.expectedAnnualReturn || 0) * 100).toFixed(2)}%</Text><Text style={styles.metricsText}>Volatility {((optimizedData.metrics.annualVolatility || 0) * 100).toFixed(2)}%</Text><Text style={styles.metricsText}>Sharpe {Number(optimizedData.metrics.sharpeRatio || 0).toFixed(2)}</Text></View></Factbox> : null}
            <View style={styles.listHeader}><Text style={styles.listTitle}>HOLDINGS</Text><Text style={styles.listCount}>{stocks.length} LINES</Text></View>
            <Rule />
            {stocks.map((stock) => <StockRow key={stock.isin || stock.ticker || stock.name} stock={stock} optimizedPercentage={optimizedData?.allocations?.[stock.ticker]} />)}
          </>
        )}
      </NewspaperLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAPER.page },
  backLink: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, marginBottom: 20 },
  backLabel: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 0.8 },
  loading: { flexDirection: "row", gap: 10, alignItems: "center", borderTopWidth: 3, borderTopColor: PAPER.ink, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 16 },
  loadingText: { color: PAPER.secondary, fontFamily: PAPER_FONTS.body, fontSize: 14 },
  emptyBox: { marginTop: 20 },
  bodyText: { color: PAPER.body, fontFamily: PAPER_FONTS.body, fontSize: 15, lineHeight: 22 },
  totalBlock: { borderTopWidth: 3, borderTopColor: PAPER.ink, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 14, marginVertical: 20 },
  eyebrow: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 1 },
  totalValue: { color: PAPER.ink, fontFamily: PAPER_FONTS.displayBold, fontSize: 42, lineHeight: 46, marginTop: 3 },
  totalNote: { color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 14, marginTop: 3 },
  actionRow: { alignItems: "flex-start", marginBottom: 22 },
  metricsBox: { marginBottom: 20 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metricsText: { color: PAPER.body, fontFamily: PAPER_FONTS.meta, fontSize: 11 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 },
  listTitle: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 11, letterSpacing: 1.1 },
  listCount: { color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 9, letterSpacing: 0.7 },
  stockRow: { borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 16 },
  stockHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBadge: { width: 38, height: 38, borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.surface, alignItems: "center", justifyContent: "center" },
  logoImage: { width: 25, height: 25 },
  logoFallback: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 15 },
  stockCopy: { flex: 1, minWidth: 0 },
  ticker: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 11, letterSpacing: 0.6 },
  stockName: { color: PAPER.body, fontFamily: PAPER_FONTS.display, fontSize: 17, lineHeight: 20, marginTop: 1 },
  stockMeta: { color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 9, letterSpacing: 0.5, marginTop: 3 },
  stockValue: { alignItems: "flex-end", maxWidth: "34%" },
  value: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 17 },
  valueMeta: { color: PAPER.secondary, fontFamily: PAPER_FONTS.meta, fontSize: 9, marginTop: 3 },
  stockDataRow: { flexDirection: "row", justifyContent: "flex-end", gap: 22, marginTop: 12, paddingLeft: 48 },
  dataLabel: { color: PAPER.muted, fontFamily: PAPER_FONTS.metaBold, fontSize: 8, letterSpacing: 0.6 },
  dataValue: { color: PAPER.secondary, fontFamily: PAPER_FONTS.meta, fontSize: 11, marginTop: 3 },
});
