import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChartFrame, Factbox, Folio, Headline, Masthead, NewspaperArticle, NewspaperLayout, NewspaperSection, PaperButton, PaperInput, Rule, Subhead } from "@/components/newspaper";
import { EditorialLineChart, EditorialPieChart } from "@/components/newspaper/charts";
import type { HistoricalValuation, InvestmentData } from "@/lib/investments-types";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { isValidPan, sanitizePan } from "@/lib/investments-validation";
import { isLinkedAccountActive, useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useGetInvestmentPanQuery, useGetMyInvestmentsQuery, useSaveInvestmentPanMutation } from "@/redux/api/investmentsApi";
import { useSyncInvestmentsMutation } from "@/redux/api/syncApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

function PanGateCard({ currentPan, panValid, isSavingPan, onPanChange, onSave }: { currentPan: string; panValid: boolean; isSavingPan: boolean; onPanChange: (value: string) => void; onSave: () => void }) {
  return (
    <Factbox title="Unlock your portfolio" accent>
      <Headline weight="Medium">Read the statement behind the numbers.</Headline>
      <Subhead>Add your PAN to decrypt and read your CAS statements. We only parse what is needed for your summary.</Subhead>
      <PaperInput label="PAN" value={currentPan} onChangeText={onPanChange} placeholder="ABCDE1234F" autoCapitalize="characters" autoCorrect={false} maxLength={10} hint="Format: 5 letters, 4 digits, 1 letter." />
      <Text style={styles.securityNote}>Your PAN and parsed investment data are securely stored with your account.</Text>
      <PaperButton onPress={onSave} disabled={!panValid} loading={isSavingPan}>Save & continue</PaperButton>
    </Factbox>
  );
}

function parseMonthYear(value: string) {
  const normalized = value.trim().replace(/[-/]/g, " ").replace(/\s+/g, " ");
  const direct = new Date(`${normalized} 01`);
  return Number.isNaN(direct.getTime()) ? null : direct;
}

function HistoricalGrowthCard({ data, hidden }: { data: HistoricalValuation[]; hidden: boolean }) {
  const chartSeries = data
    .map((item, index) => {
      const rawLabel = typeof item?.monthYear === "string" ? item.monthYear : `Period ${index + 1}`;
      const value = Number(item?.value);
      return {
        label: parseMonthYear(rawLabel)?.toLocaleDateString("en-IN", { month: "short" }).toUpperCase() || rawLabel.slice(0, 3).toUpperCase(),
        value,
      };
    })
    .filter((item) => Number.isFinite(item.value))
    .slice(-11);
  if (!chartSeries.length) return null;
  return (
    <ChartFrame title="Portfolio growth" description="Historical valuation by statement period" number="FIG. 03 / TREND" source="Your parsed CAS statements">
      {hidden ? <Text style={styles.hiddenText}>CHART HIDDEN FOR PRIVACY</Text> : <EditorialLineChart label="Portfolio growth" labels={chartSeries.map((item) => item.label)} series={[{ label: "Portfolio", values: chartSeries.map((item) => item.value), highlight: true }]} unit="INR" />}
    </ChartFrame>
  );
}

function AllocationCard({ summary, hidden }: { summary: InvestmentData["summary"] | undefined; hidden: boolean }) {
  const allocationData = useMemo(() => [
    { label: "Mutual Funds", value: Number(summary?.mfFolioValue) || 0 },
    { label: "ETFs", value: Number(summary?.mfDematValue) || 0 },
    { label: "Stocks", value: Number(summary?.equityValue) || 0 },
  ].filter((item) => Number.isFinite(item.value) && item.value > 0), [summary]);

  return (
    <ChartFrame title="Portfolio allocation" description="The composition of the current statement" number="FIG. 04 / COMPOSITION" source="Your parsed CAS statements">
      {hidden ? <Text style={styles.hiddenText}>ALLOCATION HIDDEN FOR PRIVACY</Text> : allocationData.length ? <EditorialPieChart label="Portfolio allocation" variant="donut" data={allocationData} unit="INR" /> : <Text style={styles.emptyText}>No allocation data available yet.</Text>}
    </ChartFrame>
  );
}

function SummaryCard({ title, subtitle, value, icon, onPress }: { title: string; subtitle: string; value: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.summaryRow}>
      <View style={styles.summaryIcon}><Feather name={icon} size={17} color={PAPER.accent} /></View>
      <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{title}</Text><Text style={styles.summarySubtitle}>{subtitle}</Text></View>
      <Text style={styles.summaryValue}>{value}</Text>
    </Pressable>
  );
}

function EmailSyncCta({ onLinkGmail, onLinkIcloud }: { onLinkGmail: () => void; onLinkIcloud: () => void }) {
  return (
    <Factbox title="Automatic statements" accent>
      <Headline weight="Low">Let the inbox do the filing.</Headline>
      <Text style={styles.bodyCopy}>Link an inbox to fetch the latest CAS statement whenever you tap sync.</Text>
      <View style={styles.buttonRow}><PaperButton variant="secondary" onPress={onLinkGmail}>Link Gmail</PaperButton><PaperButton variant="quiet" onPress={onLinkIcloud}>Link iCloud</PaperButton></View>
    </Factbox>
  );
}

export function InvestmentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hideValues, setHideValues] = useState(false);
  const [panInput, setPanInput] = useState("");
  const { data: linkedAccounts, isLoading: isLinkedAccountsLoading } = useGetLinkedAccountsQuery();
  const { data: storedPan, isLoading: isPanLoading } = useGetInvestmentPanQuery();
  const { data: investments, isLoading: isInvestmentsLoading } = useGetMyInvestmentsQuery();
  const [savePan, { isLoading: isSavingPan }] = useSaveInvestmentPanMutation();
  const [syncInvestments, { isLoading: isSyncing }] = useSyncInvestmentsMutation();
  const isEmailLinked = !!linkedAccounts?.some((account) => isLinkedAccountActive(account.isActive));
  const currentPan = sanitizePan(panInput || storedPan || "");
  const hasPan = isValidPan(storedPan || "");
  const panValid = isValidPan(currentPan);
  const summary = investments?.summary;
  const mutualFunds = Array.isArray(investments?.mutualFunds) ? investments.mutualFunds : [];
  const stocks = Array.isArray(investments?.stocks) ? investments.stocks : [];
  const historicalValuation = Array.isArray(investments?.historicalValuation) ? investments.historicalValuation : [];
  const hasData = !!summary && Number(summary.totalValue) > 0;

  const handleSavePan = async () => {
    try {
      const savedPan = await savePan({ pan: currentPan }).unwrap();
      setPanInput(savedPan);
      Toast.show({ type: "success", text1: "PAN saved" });
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({ type: "error", text1: "Could not save PAN", text2: apiError?.data?.message || "Please enter a valid PAN number." });
    }
  };

  const handleSync = async () => {
    if (!isEmailLinked || !hasPan) return;
    try {
      const result = await syncInvestments().unwrap();
      Toast.show({ type: "success", text1: result.alreadySynced ? "Up to date" : "Sync complete", text2: result.message });
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({ type: "error", text1: "Sync failed", text2: apiError?.data?.message || "Could not sync investments." });
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <NewspaperLayout scroll>
        <Masthead title="INVESTMENTS" kicker="Markets · Personal edition" edition="Vol. I · No. 2" date={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        <Folio page="A2" section="THE PORTFOLIO" publication="MOCO" date="CURRENT EDITION" />
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}><Feather name="arrow-left" size={14} color={PAPER.ink} /><Text style={styles.backLabel}>BACK TO FRONT PAGE</Text></Pressable>
        <View style={styles.headerActions}>
          <Text style={styles.headerNote}>A long view of the money already at work.</Text>
          {isEmailLinked && hasPan ? <Pressable onPress={handleSync} disabled={isSyncing} style={styles.syncButton}><Text style={styles.syncText}>{isSyncing ? "SYNCING…" : "SYNC ↻"}</Text></Pressable> : null}
        </View>

        {isLinkedAccountsLoading || isPanLoading || isInvestmentsLoading ? (
          <View style={styles.loading}><ActivityIndicator color={PAPER.accent} /><Text style={styles.loadingText}>Loading investments...</Text></View>
        ) : !hasPan ? (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}><PanGateCard currentPan={currentPan} panValid={panValid} isSavingPan={isSavingPan} onPanChange={(value) => setPanInput(sanitizePan(value))} onSave={handleSavePan} /></ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <NewspaperSection columns={24} gap={20}>
            {!isEmailLinked ? <NewspaperArticle span={24}><EmailSyncCta onLinkGmail={() => navigation.navigate("EmailCredentials", { mode: "create", provider: "gmail" })} onLinkIcloud={() => navigation.navigate("EmailCredentials", { mode: "create", provider: "icloud" })} /></NewspaperArticle> : null}
            <NewspaperArticle span={16}>
              <Factbox title={investments?.statementPeriod ? `Statement period · ${investments.statementPeriod}` : "Portfolio value"}>
                <View style={styles.valueRow}><Text style={styles.portfolioValue}>{hideValues ? "••••••••" : formatCurrency(summary?.totalValue || 0)}</Text><Pressable onPress={() => setHideValues((value) => !value)} style={styles.eyeButton}><Feather name={hideValues ? "eye-off" : "eye"} size={16} color={PAPER.accent} /></Pressable></View>
              </Factbox>
              <View style={styles.summaryHeader}><Text style={styles.sectionLabel}>YOUR SUMMARY</Text><Rule /></View>
              {hasData ? <View>{<SummaryCard title="Mutual funds" subtitle={`${mutualFunds.length} funds`} value={hideValues ? "••••••" : formatCurrency(Number(summary?.mfFolioValue || 0) + Number(summary?.mfDematValue || 0))} icon="layers" onPress={() => navigation.navigate("MutualFunds")} />}<SummaryCard title="Stocks" subtitle={`${stocks.length} stocks`} value={hideValues ? "••••••" : formatCurrency(Number(summary?.equityValue || 0))} icon="trending-up" onPress={() => navigation.navigate("Stocks")} /></View> : <Factbox><Text style={styles.emptyText}>No investment data yet. Tap sync to fetch your latest CAS statement.</Text></Factbox>}
            </NewspaperArticle>
            <NewspaperArticle span={8}>
              <Factbox title="Issue notes"><Text style={styles.bodyCopy}>Values can be hidden at any time. Tap a summary line to read the underlying holdings.</Text></Factbox>
            </NewspaperArticle>
            {hasData ? <NewspaperArticle span={24}><HistoricalGrowthCard data={historicalValuation} hidden={hideValues} /><AllocationCard summary={summary} hidden={hideValues} /></NewspaperArticle> : null}
          </NewspaperSection>
        )}
      </NewspaperLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAPER.page },
  backLink: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, marginBottom: 12 },
  backLabel: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 0.8 },
  securityNote: { fontFamily: PAPER_FONTS.meta, color: PAPER.muted, fontSize: 11, lineHeight: 16, marginBottom: 16 },
  hiddenText: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.muted, fontSize: 11, letterSpacing: 1, paddingVertical: 20 },
  emptyText: { fontFamily: PAPER_FONTS.body, color: PAPER.secondary, fontSize: 14, lineHeight: 21 },
  bodyCopy: { fontFamily: PAPER_FONTS.body, color: PAPER.body, fontSize: 15, lineHeight: 22, marginBottom: 14 },
  buttonRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  headerActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
  headerNote: { flex: 1, fontFamily: PAPER_FONTS.bodyItalic, color: PAPER.secondary, fontSize: 15, lineHeight: 21 },
  syncButton: { borderWidth: 1, borderColor: PAPER.accent, paddingHorizontal: 10, paddingVertical: 8 },
  syncText: { color: PAPER.accent, fontFamily: PAPER_FONTS.metaBold, fontSize: 10, letterSpacing: 0.7 },
  loading: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 3, borderTopColor: PAPER.decorative, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, backgroundColor: PAPER.surface, padding: 16 },
  loadingText: { fontFamily: PAPER_FONTS.body, color: PAPER.secondary, fontSize: 14 },
  scrollContent: { paddingBottom: 32 },
  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  portfolioValue: { fontFamily: PAPER_FONTS.displayBold, color: PAPER.ink, fontSize: 38, lineHeight: 42 },
  eyeButton: { borderWidth: 1, borderColor: PAPER.hairline, padding: 8 },
  summaryHeader: { marginTop: 22, marginBottom: 8 },
  sectionLabel: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.accent, fontSize: 10, letterSpacing: 1, marginBottom: 7 },
  summaryRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: 14, gap: 10 },
  summaryIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.highlight },
  summaryCopy: { flex: 1 },
  summaryTitle: { fontFamily: PAPER_FONTS.display, color: PAPER.ink, fontSize: 20 },
  summarySubtitle: { fontFamily: PAPER_FONTS.meta, color: PAPER.muted, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 },
  summaryValue: { fontFamily: PAPER_FONTS.display, color: PAPER.accent, fontSize: 17 },
});
