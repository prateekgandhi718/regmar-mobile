import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { getMutualFundLogoUrl } from "@/lib/investment-logos";
import type { MutualFund } from "@/lib/investments-types";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetMyInvestmentsQuery } from "@/redux/api/investmentsApi";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const formatCompactSipTotal = (amount: number) => {
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
};

const formatSipBadgeAmount = (amount: number) => {
  if (amount >= 1000) {
    const value = amount / 1000;
    return Number.isInteger(value) ? `${value.toFixed(0)}k` : `${value.toFixed(1)}k`;
  }
  return amount.toFixed(0);
};

function SipBadge({ isActive, sipAmount }: { isActive: boolean; sipAmount: number }) {
  if (!isActive) {
    return (
      <View style={styles.inactiveBadge}>
        <Feather name="minus-circle" size={10} color="#A1A1AA" />
        <Text style={styles.inactiveBadgeText}>Inactive SIP</Text>
      </View>
    );
  }

  return (
    <View style={styles.activeBadge}>
      <Feather name="repeat" size={10} color="#E4E4E7" />
      <Text style={styles.activeBadgeText}>{formatSipBadgeAmount(sipAmount)}/month</Text>
    </View>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          highlight ? styles.metricHighlight : null,
          tone === "positive" ? styles.metricPositive : null,
          tone === "negative" ? styles.metricNegative : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MutualFundCard({ fund, primaryColor }: { fund: MutualFund; primaryColor: string }) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = logoError ? null : getMutualFundLogoUrl(fund.amc);
  const pnlPositive = fund.unrealizedPnL >= 0;

  return (
    <View style={styles.fundCard}>
      <View style={styles.fundHeader}>
        <View style={styles.fundTitleWrap}>
          <View style={styles.logoShell}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} resizeMode="contain" style={styles.logoImage} onError={() => setLogoError(true)} />
            ) : (
              <Text style={styles.logoFallbackText}>{(fund.amc || fund.name).slice(0, 2).toUpperCase()}</Text>
            )}
          </View>

          <View style={styles.fundTitleCopy}>
            <Text numberOfLines={2} style={styles.fundTitle}>
              {fund.name}
            </Text>
            <Text numberOfLines={1} style={styles.fundSubtitle}>
              {fund.amc}
            </Text>
            <View style={styles.badgeRow}>
              <SipBadge isActive={fund.sipActive} sipAmount={fund.sipMonthlyAmount} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricRow label="Invested" value={formatCurrency(fund.investedValue)} />
        <MetricRow label="Current" value={formatCurrency(fund.currentValue)} highlight />
        <MetricRow label="Units" value={fund.units.toFixed(3)} />
        <MetricRow label="NAV" value={formatCurrency(fund.nav)} />
        <MetricRow
          label="P&L"
          value={formatCurrency(fund.unrealizedPnL)}
          highlight={pnlPositive}
          tone={pnlPositive ? "positive" : "negative"}
        />
        <MetricRow
          label="P&L %"
          value={`${fund.unrealizedPnLPercentage.toFixed(2)}%`}
          highlight={pnlPositive}
          tone={pnlPositive ? "positive" : "negative"}
        />
      </View>

      <View style={styles.fundFooter}>
        <Text style={styles.folioText}>Folio {fund.folio || "-"}</Text>
        <Text style={[styles.typePill, { color: primaryColor }]}>{fund.type}</Text>
      </View>
    </View>
  );
}

export function MutualFundsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useColorTheme();
  const { data, isLoading } = useGetMyInvestmentsQuery();

  const mutualFunds = useMemo(
    () => [...(data?.mutualFunds || [])].sort((a, b) => Number(b.sipActive) - Number(a.sipActive) || b.currentValue - a.currentValue),
    [data?.mutualFunds],
  );

  const sipSummary = data?.sipSummary || { activeFunds: 0, totalMonthlyAmount: 0 };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <View className="flex-1 px-6 pt-4">
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={18} color="#E4E4E7" />
            </Pressable>
            <View>
              <Text style={[styles.headerTitle, { color: colors.primary }]}>Mutual Funds</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#D4D4D8" />
            <Text style={styles.loadingText}>Loading mutual funds...</Text>
          </View>
        ) : mutualFunds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="layers" size={22} color={withOpacity(colors.primary, 0.6)} />
            <Text style={styles.emptyTitle}>No mutual funds yet</Text>
            <Text style={styles.emptyDescription}>Sync from Investments to fetch your latest CAS holdings.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.sipSummaryShell}>
              <View style={styles.sipGlowA} />
              <View style={styles.sipGlowB} />
              <LinearGradient colors={["rgba(24,24,27,0.96)", "rgba(9,9,11,1)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.sipSummaryCard}>
                  <Text style={styles.sipLabel}>Total Monthly SIP</Text>
                  <Text style={[styles.sipAmount, { color: colors.primary }]}>{formatCompactSipTotal(sipSummary.totalMonthlyAmount)}</Text>

                  <View style={styles.sipChipRow}>
                    <View style={styles.sipChip}>
                      <Feather name="activity" size={12} color="#A5B4FC" />
                      <Text style={styles.sipChipText}>
                        {sipSummary.activeFunds} Active SIP{sipSummary.activeFunds === 1 ? "" : "s"}
                      </Text>
                    </View>

                    <View style={styles.sipChip}>
                      <Feather name="layers" size={12} color="#86EFAC" />
                      <Text style={styles.sipChipText}>{mutualFunds.length} Funds</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {mutualFunds.map((fund) => (
              <MutualFundCard key={fund.isin} fund={fund} primaryColor={colors.primary} />
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
  sipSummaryShell: {
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "#09090B",
  },
  sipGlowA: {
    position: "absolute",
    top: -36,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(126,166,255,0.2)",
  },
  sipGlowB: {
    position: "absolute",
    top: 30,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(105,227,176,0.15)",
  },
  sipSummaryCard: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  sipLabel: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  sipAmount: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sipChipRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  sipChip: {
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
  sipChipText: {
    color: "#D4D4D8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fundCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "#101014",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  fundHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  fundTitleWrap: {
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
  fundTitleCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 2,
  },
  badgeRow: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  fundTitle: {
    color: "#F4F4F5",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  fundSubtitle: {
    color: "#8F9099",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  activeBadge: {
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
  activeBadgeText: {
    color: "#E4E4E7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inactiveBadgeText: {
    color: "#A1A1AA",
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
  metricPositive: {
    color: "#86EFAC",
  },
  metricNegative: {
    color: "#FDA4AF",
  },
  fundFooter: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  folioText: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  typePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
