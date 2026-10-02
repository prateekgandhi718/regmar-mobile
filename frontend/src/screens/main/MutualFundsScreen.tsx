import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Factbox, Folio, Headline, Masthead, NewspaperLayout, PaperButton, Rule, Subhead } from "@/components/newspaper";
import { getMutualFundLogoUrl } from "@/lib/investment-logos";
import type { MutualFund } from "@/lib/investments-types";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetMyInvestmentsQuery } from "@/redux/api/investmentsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatCurrency = (value: number) => {
  const numeric = Number(value) || 0;
  if (Math.abs(numeric) >= 10000000) return `₹${(numeric / 10000000).toFixed(2)}Cr`;
  if (Math.abs(numeric) >= 100000) return `₹${(numeric / 100000).toFixed(2)}L`;
  return `₹${Math.round(numeric).toLocaleString("en-IN")}`;
};

function FundRow({ fund }: { fund: MutualFund }) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = logoError ? null : getMutualFundLogoUrl(fund.amc);
  const pnl = Number(fund.unrealizedPnL) || 0;
  return (
    <View style={styles.fundRow}>
      <View style={styles.fundHeading}>
        <View style={styles.logoBadge}>
          {logoUrl ? <Image source={{ uri: logoUrl }} resizeMode="contain" style={styles.logoImage} onError={() => setLogoError(true)} /> : <Text style={styles.logoFallback}>{(fund.amc || fund.name || "MF").slice(0, 2).toUpperCase()}</Text>}
        </View>
        <View style={styles.fundCopy}>
          <Text numberOfLines={2} style={styles.fundName}>{fund.name || "Unnamed fund"}</Text>
          <Text style={styles.fundMeta}>{fund.amc || "AMC unavailable"} · {fund.type || "—"}</Text>
          <Text style={styles.fundMeta}>Folio {fund.folio || "—"}</Text>
        </View>
        <View style={styles.fundValue}>
          <Text style={styles.value}>{formatCurrency(fund.currentValue)}</Text>
          <Text style={styles.valueMeta}>{pnl >= 0 ? "+" : "−"}{formatCurrency(Math.abs(pnl))}</Text>
        </View>
      </View>
      <View style={styles.fundDataRow}>
        <View><Text style={styles.dataLabel}>INVESTED</Text><Text style={styles.dataValue}>{formatCurrency(fund.investedValue)}</Text></View>
        <View><Text style={styles.dataLabel}>UNITS</Text><Text style={styles.dataValue}>{Number(fund.units || 0).toFixed(3)}</Text></View>
        <View><Text style={styles.dataLabel}>NAV</Text><Text style={styles.dataValue}>{formatCurrency(fund.nav)}</Text></View>
        {fund.sipActive ? <View><Text style={styles.dataLabel}>SIP</Text><Text style={styles.dataValue}>₹{Math.round(fund.sipMonthlyAmount || 0).toLocaleString("en-IN")}/mo</Text></View> : null}
      </View>
    </View>
  );
}

export function MutualFundsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading } = useGetMyInvestmentsQuery();
  const mutualFunds = useMemo(() => (Array.isArray(data?.mutualFunds) ? [...data.mutualFunds].sort((a, b) => Number(b.sipActive) - Number(a.sipActive) || Number(b.currentValue) - Number(a.currentValue)) : []), [data?.mutualFunds]);
  const sipSummary = data?.sipSummary || { activeFunds: 0, totalMonthlyAmount: 0 };
  const totalValue = mutualFunds.reduce((sum, fund) => sum + Number(fund.currentValue || 0), 0);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <NewspaperLayout scroll>
        <Masthead title="MUTUAL FUNDS" edition="Vol. I · No. 3" date={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        <Folio page="A3" section="FUNDS & SIP" publication="MOCO" date="CURRENT EDITION" />
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}><Feather name="arrow-left" size={14} color={PAPER.ink} /><Text style={styles.backLabel}>BACK TO INVESTMENTS</Text></Pressable>

        {isLoading ? <View style={styles.loading}><ActivityIndicator color={PAPER.ink} /><Text style={styles.loadingText}>Reading the statement...</Text></View> : mutualFunds.length === 0 ? (
          <Factbox title="No funds in the edition" style={styles.emptyBox}><Text style={styles.bodyText}>Sync a CAS statement from Investments to populate the mutual-fund desk.</Text></Factbox>
        ) : (
          <>
            <Headline>The patient capital desk.</Headline>
            <Subhead>Funds, folios and recurring commitments, separated into a quiet ledger.</Subhead>
            <View style={styles.summaryBlock}>
              <View><Text style={styles.eyebrow}>CURRENT FUND VALUE</Text><Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text></View>
              <View style={styles.summaryRight}><Text style={styles.eyebrow}>MONTHLY SIP</Text><Text style={styles.summarySmall}>₹{Math.round(sipSummary.totalMonthlyAmount || 0).toLocaleString("en-IN")}</Text><Text style={styles.summaryNote}>{sipSummary.activeFunds} active SIP{sipSummary.activeFunds === 1 ? "" : "s"}</Text></View>
            </View>
            <View style={styles.listHeader}><Text style={styles.listTitle}>FUND HOLDINGS</Text><Text style={styles.listCount}>{mutualFunds.length} LINES</Text></View>
            <Rule />
            {mutualFunds.map((fund) => <FundRow key={fund.isin || fund.folio || fund.name} fund={fund} />)}
            <View style={styles.note}><Text style={styles.noteText}>SIP totals and P&L are taken from the latest parsed statement.</Text></View>
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
  summaryBlock: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 3, borderTopColor: PAPER.ink, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 15, marginVertical: 20 },
  eyebrow: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 1 },
  summaryValue: { color: PAPER.ink, fontFamily: PAPER_FONTS.displayBold, fontSize: 38, lineHeight: 42, marginTop: 3 },
  summaryRight: { alignItems: "flex-end" },
  summarySmall: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 23, marginTop: 3 },
  summaryNote: { color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 12, marginTop: 2 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 },
  listTitle: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 11, letterSpacing: 1.1 },
  listCount: { color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 9, letterSpacing: 0.7 },
  fundRow: { borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 16 },
  fundHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBadge: { width: 38, height: 38, borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.surface, alignItems: "center", justifyContent: "center" },
  logoImage: { width: 25, height: 25 },
  logoFallback: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 15 },
  fundCopy: { flex: 1, minWidth: 0 },
  fundName: { color: PAPER.body, fontFamily: PAPER_FONTS.display, fontSize: 17, lineHeight: 20 },
  fundMeta: { color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 9, marginTop: 3 },
  fundValue: { alignItems: "flex-end", maxWidth: "34%" },
  value: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 17 },
  valueMeta: { color: PAPER.secondary, fontFamily: PAPER_FONTS.meta, fontSize: 9, marginTop: 3 },
  fundDataRow: { flexDirection: "row", justifyContent: "flex-end", gap: 18, marginTop: 12, paddingLeft: 48, flexWrap: "wrap" },
  dataLabel: { color: PAPER.muted, fontFamily: PAPER_FONTS.metaBold, fontSize: 8, letterSpacing: 0.6 },
  dataValue: { color: PAPER.secondary, fontFamily: PAPER_FONTS.meta, fontSize: 11, marginTop: 3 },
  note: { borderTopWidth: 1, borderTopColor: PAPER.hairline, marginTop: 24, paddingTop: 12 },
  noteText: { color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 13, lineHeight: 20 },
});
