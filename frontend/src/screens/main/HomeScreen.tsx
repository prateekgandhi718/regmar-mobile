import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MocoLogo } from "@/components/moco-logo";
import { ChartFrame, Factbox, Folio, Headline, Kicker, Masthead, NewspaperArticle, NewspaperLayout, NewspaperSection, PaperButton, Rule, Subhead } from "@/components/newspaper";
import { EditorialLineChart } from "@/components/newspaper/charts";
import { EditTransactionDrawer } from "@/components/transactions/EditTransactionDrawer";
import { formatAmount, getEffectiveAmount, getEffectiveDate, getMerchantName, getSignedExpenseAmount, isDebitTransaction } from "@/components/transactions/transaction-utils";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { isLinkedAccountActive, useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useGetMyInvestmentsQuery } from "@/redux/api/investmentsApi";
import { useGetTransactionsQuery } from "@/redux/api/transactionsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

const formatCurrency = (value: number) => {
  const numeric = Number(value) || 0;
  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(2)}Cr`;
  if (numeric >= 100000) return `₹${(numeric / 100000).toFixed(2)}L`;
  return `₹${Math.round(numeric).toLocaleString("en-IN")}`;
};

function MarketWatch({ investments }: { investments: ReturnType<typeof useGetMyInvestmentsQuery>["data"] }) {
  const rows = useMemo(() => {
    const result: { label: string; value: string; note: string }[] = [];
    if (investments?.summary) result.push({ label: "Portfolio value", value: formatCurrency(investments.summary.totalValue), note: "current" });
    for (const stock of (investments?.stocks || []).slice(0, 2)) {
      result.push({ label: stock.ticker || stock.name, value: formatCurrency(stock.marketPrice), note: `${Number(stock.currentPercentage || 0).toFixed(1)}% holding` });
    }
    for (const fund of (investments?.mutualFunds || []).slice(0, 2)) {
      result.push({ label: fund.amc || fund.name, value: formatCurrency(fund.currentValue), note: "fund value" });
    }
    return result.slice(0, 5);
  }, [investments]);

  return (
    <View style={styles.marketWatch}>
      <Text style={styles.marketTitle}>THE MARKETS</Text>
      <Rule />
      {rows.length ? rows.map((row) => (
        <View key={`${row.label}-${row.note}`} style={styles.marketRow}>
          <Text numberOfLines={1} style={styles.marketLabel}>{row.label}</Text>
          <View style={styles.marketValueWrap}>
            <Text numberOfLines={1} style={styles.marketValue}>{row.value}</Text>
            <Text numberOfLines={1} style={styles.marketNote}>{row.note}</Text>
          </View>
        </View>
      )) : <Text style={styles.marketEmpty}>Sync your portfolio to populate the market watch.</Text>}
      <Text style={styles.marketCaption}>A quiet reading of the accounts already at work.</Text>
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: linkedAccounts = [] } = useGetLinkedAccountsQuery();
  const { data: transactions = [] } = useGetTransactionsQuery();
  const { data: investments } = useGetMyInvestmentsQuery();
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const hasLinkedEmail = linkedAccounts.some((account) => isLinkedAccountActive(account.isActive));
  const latestTransactions = useMemo(() => [...transactions].sort((a, b) => getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime()).slice(0, 5), [transactions]);
  const portfolioValue = Number(investments?.summary?.totalValue) || 0;
  const hasPortfolio = portfolioValue > 0;

  const edition = useMemo(() => {
    const now = new Date();
    const currentMonth = transactions.filter((transaction) => {
      const date = getEffectiveDate(transaction);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && !transaction.refunded;
    });
    const spent = currentMonth.reduce((sum, transaction) => sum + Math.max(0, getSignedExpenseAmount(transaction)), 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const value = transactions.reduce((sum, transaction) => {
        const transactionDate = getEffectiveDate(transaction);
        if (transaction.refunded || transactionDate.toDateString() !== date.toDateString()) return sum;
        return sum + Math.max(0, getSignedExpenseAmount(transaction));
      }, 0);
      return { label: date.toLocaleDateString("en-IN", { weekday: "short" }), value: Math.round(value) };
    });
    return { spent, currentMonthCount: currentMonth.length, days };
  }, [transactions]);

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <NewspaperLayout scroll>
        <Masthead title="MOCO" logo={<MocoLogo size={26} monochrome />} edition="Vol. I · No. 1" date={today} />
        <Folio page="A1" section="THE DAILY EDITION" publication="MOCO" date={today} />

        <View style={styles.topline}>
          <Text style={styles.toplineText}>PERSONAL FINANCE · THE MORNING EDITION</Text>
          <Pressable onPress={() => navigation.navigate("Settings")} accessibilityRole="button" accessibilityLabel="Open settings">
            <Feather name="settings" size={17} color={PAPER.ink} />
          </Pressable>
        </View>

        <NewspaperSection columns={24} gap={24} divider="bottom">
          <NewspaperArticle span={16}>
            <Kicker style={styles.inkKicker}>THE LEDGER</Kicker>
            <Headline>Every rupee has a story.</Headline>
            <Subhead>Today’s edition brings the movement of your money onto one readable page.</Subhead>
            <View style={styles.leadMetric}>
              <Text style={styles.metricLabel}>SPENT THIS MONTH</Text>
              <Text style={styles.metricValue}>₹{Math.round(edition.spent).toLocaleString("en-IN")}</Text>
              <Text style={styles.metricNote}>{edition.currentMonthCount} recorded {edition.currentMonthCount === 1 ? "entry" : "entries"}</Text>
            </View>
            <ChartFrame title="The week in spending" description="Daily recorded outflow · last seven days" number="FIG. 01 / LEDGER" source="Your recorded transactions">
              <EditorialLineChart label="The week in spending" labels={edition.days.map((item) => item.label)} series={[{ label: "Outflow", values: edition.days.map((item) => item.value), highlight: true }]} unit="INR" />
            </ChartFrame>
            <Pressable onPress={() => navigation.navigate("Transactions")} style={styles.textLink}><Text style={styles.textLinkLabel}>VIEW ALL TRANSACTIONS →</Text></Pressable>
          </NewspaperArticle>

          <NewspaperArticle span={8}>
            <MarketWatch investments={investments} />
            <Factbox title="The connected edition">
              <Text style={styles.factText}>{hasLinkedEmail ? "Your inbox is linked. Open the ledger whenever a new statement arrives." : "Link an inbox to bring statements into the ledger."}</Text>
              {!hasLinkedEmail ? <PaperButton variant="quiet" onPress={() => navigation.navigate("EmailCredentials", { mode: "create", provider: "gmail" })}>Link email</PaperButton> : null}
            </Factbox>
          </NewspaperArticle>
        </NewspaperSection>

        <View style={styles.sectionSpace}><Rule variant="double" /></View>

        <NewspaperSection columns={24} gap={24}>
          <NewspaperArticle span={14}>
            <Kicker style={styles.inkKicker}>PORTFOLIO DESK</Kicker>
            <Headline weight="Medium">The money already at work.</Headline>
            <Subhead>Holdings, statements and long views, gathered below the fold.</Subhead>
            <View style={styles.portfolioLead}>
              <Text style={styles.metricLabel}>CURRENT PORTFOLIO VALUE</Text>
              <Text style={styles.portfolioValue}>{hasPortfolio ? formatCurrency(portfolioValue) : "Not yet reported"}</Text>
              <Text style={styles.metricNote}>{hasPortfolio ? `${investments?.mutualFunds.length || 0} funds · ${investments?.stocks.length || 0} stocks` : "Save your PAN and sync a statement to begin."}</Text>
            </View>
            <View style={styles.linkRow}>
              <Pressable onPress={() => navigation.navigate("Investments")} style={styles.textLink}><Text style={styles.textLinkLabel}>READ INVESTMENTS →</Text></Pressable>
              {hasPortfolio ? <Pressable onPress={() => navigation.navigate("Stocks")} style={styles.textLink}><Text style={styles.textLinkLabel}>STOCKS →</Text></Pressable> : null}
            </View>
          </NewspaperArticle>

          <NewspaperArticle span={10}>
            <View style={styles.latestLedger}>
              <Text style={styles.latestTitle}>LATEST ENTRIES</Text>
              <Rule />
              {latestTransactions.length ? latestTransactions.map((transaction) => {
                const debit = isDebitTransaction(transaction);
                return (
                  <View key={transaction.clientTxnId} style={styles.latestRow}>
                    <View style={styles.latestCopy}>
                      <Text numberOfLines={1} style={styles.latestMerchant}>{getMerchantName(transaction)}</Text>
                      <Text style={styles.latestDate}>{getEffectiveDate(transaction).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</Text>
                    </View>
                    <Text style={styles.latestAmount}>{debit ? "−" : "+"}₹{formatAmount(getEffectiveAmount(transaction))}</Text>
                  </View>
                );
              }) : <Text style={styles.marketEmpty}>No entries in the ledger yet.</Text>}
              <Pressable onPress={() => setIsRecordDrawerOpen(true)} style={styles.textLink}><Text style={styles.textLinkLabel}>RECORD AN ENTRY →</Text></Pressable>
            </View>
          </NewspaperArticle>
        </NewspaperSection>
      </NewspaperLayout>

      <EditTransactionDrawer mode="create" transaction={null} open={isRecordDrawerOpen} onClose={() => setIsRecordDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAPER.page },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingBottom: 10, marginBottom: 18 },
  toplineText: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaMedium, fontSize: 9, letterSpacing: 1.1 },
  inkKicker: { color: PAPER.ink },
  leadMetric: { borderTopWidth: 3, borderTopColor: PAPER.ink, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 16, marginTop: 18, marginBottom: 22 },
  metricLabel: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 1.05, marginBottom: 4 },
  metricValue: { color: PAPER.ink, fontFamily: PAPER_FONTS.displayBold, fontSize: 44, lineHeight: 48 },
  portfolioValue: { color: PAPER.ink, fontFamily: PAPER_FONTS.displayBold, fontSize: 34, lineHeight: 38 },
  metricNote: { color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 14, marginTop: 5 },
  marketWatch: { borderLeftWidth: 1, borderLeftColor: PAPER.hairline, paddingLeft: 16, marginBottom: 24 },
  marketTitle: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 18, lineHeight: 23, letterSpacing: 1.5, marginBottom: 10 },
  marketRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, borderBottomColor: PAPER.hairline },
  marketLabel: { flex: 1, color: PAPER.body, fontFamily: PAPER_FONTS.display, fontSize: 18, lineHeight: 22 },
  marketValueWrap: { alignItems: "flex-end", maxWidth: "52%" },
  marketValue: { color: PAPER.ink, fontFamily: PAPER_FONTS.displayBold, fontSize: 18 },
  marketNote: { color: PAPER.secondary, fontFamily: PAPER_FONTS.meta, fontSize: 9, marginTop: 2 },
  marketCaption: { color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 14, lineHeight: 20, marginTop: 14 },
  marketEmpty: { color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 14, lineHeight: 20, paddingVertical: 14 },
  factText: { color: PAPER.body, fontFamily: PAPER_FONTS.body, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  sectionSpace: { marginVertical: 8 },
  portfolioLead: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: PAPER.hairline, paddingVertical: 14, marginTop: 12 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  textLink: { paddingVertical: 8 },
  textLinkLabel: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 0.85 },
  latestLedger: { borderTopWidth: 3, borderTopColor: PAPER.ink, backgroundColor: PAPER.surface, paddingTop: 12 },
  latestTitle: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 11, letterSpacing: 1.1 },
  latestRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: PAPER.hairline },
  latestCopy: { flex: 1 },
  latestMerchant: { color: PAPER.body, fontFamily: PAPER_FONTS.display, fontSize: 16 },
  latestDate: { color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 9, marginTop: 3, textTransform: "uppercase" },
  latestAmount: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 15 },
});
