import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { LineChart, PieChart, type lineDataItem, type pieDataItem } from "react-native-gifted-charts";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useTiltPress } from "@/hooks/use-tilt-press";
import type { HistoricalValuation, InvestmentData } from "@/lib/investments-types";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { isValidPan, sanitizePan } from "@/lib/investments-storage";
import { isLinkedAccountActive, useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useGetInvestmentPanQuery, useGetMyInvestmentsQuery, useSaveInvestmentPanMutation } from "@/redux/api/investmentsApi";
import { useSyncInvestmentsMutation } from "@/redux/api/syncApi";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const INVESTMENT_ALLOCATION_COLORS = {
  mutualFunds: "#7EA6FF",
  etfs: "#F4C84A",
  stocks: "#69E3B0",
};

type PanGateCardProps = {
  currentPan: string;
  panValid: boolean;
  isSavingPan: boolean;
  onPanChange: (value: string) => void;
  onSave: () => void;
  primaryColor: string;
  onTopOfPrimary: string;
};

function PanGateCard({
  currentPan,
  panValid,
  isSavingPan,
  onPanChange,
  onSave,
  primaryColor,
  onTopOfPrimary,
}: PanGateCardProps) {
  return (
    <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-6">
      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withOpacity(primaryColor, 0.2) }}>
        <Feather name="shield" size={20} color={primaryColor} />
      </View>

      <Text className="mt-4 text-zinc-50" style={{ fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.4 }}>
        Unlock your portfolio
      </Text>

      <Text className="mt-3 text-base leading-7 text-zinc-300">
        Add your PAN to decrypt and read your CAS statements. We only parse what is needed for your summary.
      </Text>

      <View className="mt-5">
        <Text className="mb-2 text-[13px] text-zinc-300">PAN</Text>
        <TextInput
          value={currentPan}
          onChangeText={onPanChange}
          placeholder="ABCDE1234F"
          placeholderTextColor="#71717A"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(228,228,231,0.16)",
            backgroundColor: "rgba(24,24,27,0.94)",
            color: "#F4F4F5",
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 22,
            fontWeight: "800",
            textAlign: "center",
            letterSpacing: 1.5,
          }}
        />
        <Text className="mt-2 text-xs text-zinc-500">Format: 5 letters, 4 digits, 1 letter (for example: ABCDE1234F)</Text>
      </View>

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
        <Text className="text-sm leading-6 text-zinc-400">Your PAN and parsed investment data stay stored on this phone only.</Text>
      </View>

      <Pressable
        onPress={onSave}
        disabled={isSavingPan || !panValid}
        className="mt-5 items-center rounded-2xl px-4 py-4"
        style={{ backgroundColor: panValid ? primaryColor : withOpacity(primaryColor, 0.35) }}
      >
        {isSavingPan ? (
          <ActivityIndicator size="small" color={onTopOfPrimary} />
        ) : (
          <Text className="text-lg font-semibold" style={{ color: onTopOfPrimary }}>
            Save & Continue
          </Text>
        )}
      </Pressable>
    </View>
  );
}

type HistoricalGrowthCardProps = {
  data: HistoricalValuation[];
  hidden: boolean;
  lineColor: string;
};

function HistoricalGrowthCard({ data, hidden, lineColor }: HistoricalGrowthCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  if (!data.length) return null;

  if (hidden) {
    return (
      <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-6">
        <Text className="text-xs font-black uppercase tracking-[1.5px] text-zinc-500">Portfolio Growth</Text>
        <Text className="mt-4 text-xs font-black uppercase tracking-[1.5px] text-zinc-500">Chart hidden for privacy</Text>
      </View>
    );
  }

  const parseMonthYear = (value: string) => {
    const normalized = value.trim().replace(/[-/]/g, " ").replace(/\s+/g, " ");
    const direct = new Date(`${normalized} 01`);
    if (!Number.isNaN(direct.getTime())) return direct;

    const match = normalized.match(/^([A-Za-z]{3,9})\s+(\d{2,4})$/);
    if (!match) return null;

    const monthName = match[1];
    const yearRaw = match[2];
    const monthDate = new Date(`${monthName} 01 2000`);
    if (Number.isNaN(monthDate.getTime())) return null;
    const month = monthDate.getMonth();

    const yearNum = Number(yearRaw);
    if (Number.isNaN(yearNum)) return null;
    const year = yearRaw.length === 2 ? 2000 + yearNum : yearNum;
    return new Date(year, month, 1);
  };

  const getShortMonth = (value: string) => {
    const parsed = parseMonthYear(value);
    if (parsed) {
      return parsed.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
    }
    return value.slice(0, 3).toUpperCase();
  };

  const normalizedData = data
    .map((item) => ({
      ...item,
      parsedDate: parseMonthYear(item.monthYear),
    }))
    .filter((item): item is HistoricalValuation & { parsedDate: Date } => !!item.parsedDate)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  const uniqueByMonth = new Map<string, HistoricalValuation & { parsedDate: Date }>();
  normalizedData.forEach((item) => {
    uniqueByMonth.set(`${item.parsedDate.getFullYear()}-${item.parsedDate.getMonth()}`, item);
  });
  const chartSeries = (uniqueByMonth.size > 0
    ? Array.from(uniqueByMonth.values())
    : data.map((item) => ({ ...item, parsedDate: new Date(0) }))).slice(-11);

  if (!chartSeries.length) return null;

  const values = chartSeries.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rawRange = Math.max(maxValue - minValue, 1);
  const verticalPadding = Math.max(rawRange * 0.35, maxValue * 0.015, 8000);
  const yAxisOffset = Math.max(0, minValue - verticalPadding);
  const chartMaxValue = maxValue - yAxisOffset + verticalPadding * 0.35;

  const lineData = chartSeries.map<lineDataItem>((item) => ({
    value: item.value,
    label: getShortMonth(item.monthYear),
    dataPointText: formatCurrency(item.value),
  }));
  const chartWidth = Math.max(260, screenWidth - 94);
  const spacing = lineData.length > 1 ? Math.max(20, (chartWidth - 20) / (lineData.length - 1)) : chartWidth;

  const resolvePointerItem = (payload: unknown): lineDataItem | undefined => {
    if (Array.isArray(payload)) {
      const firstWithValue = payload.find(
        (item) => item && typeof item === "object" && "value" in (item as Record<string, unknown>),
      );
      return firstWithValue as lineDataItem | undefined;
    }

    if (payload && typeof payload === "object") {
      if ("value" in (payload as Record<string, unknown>)) {
        return payload as lineDataItem;
      }
      const nestedItem = (payload as { item?: lineDataItem }).item;
      if (nestedItem && nestedItem.value !== undefined) {
        return nestedItem;
      }
    }

    return undefined;
  };

  return (
    <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-6">
      <Text className="mb-6 text-xs font-black uppercase tracking-[1.5px] text-zinc-500">Portfolio Growth</Text>
      <View className="rounded-2xl">
        <LineChart
          data={lineData}
          areaChart
          curved
          height={210}
          isAnimated
          animationDuration={900}
          color="#F4F4F5"
          startFillColor="#F4F4F5"
          endFillColor="#F4F4F5"
          startOpacity={0.24}
          endOpacity={0.02}
          thickness={4}
          hideDataPoints
          maxValue={chartMaxValue}
          yAxisOffset={yAxisOffset}
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules={false}
          rulesColor={withOpacity("#FFFFFF", 0.08)}
          rulesType="dashed"
          dashWidth={4}
          dashGap={4}
          noOfSections={4}
          yAxisLabelWidth={0}
          hideYAxisText
          xAxisLabelTextStyle={{
            color: withOpacity("#A1A1AA", 0.75),
            fontSize: 8,
            fontWeight: "800",
            textTransform: "uppercase",
          }}
          xAxisLabelsHeight={20}
          initialSpacing={8}
          endSpacing={10}
          spacing={spacing}
          width={chartWidth}
          adjustToWidth={false}
          disableScroll
          pointerConfig={{
            activatePointersOnLongPress: true,
            activatePointersInstantlyOnTouch: true,
            pointerColor: "#F4F4F5",
            radius: 6,
            pointerStripColor: withOpacity("#F4F4F5", 0.85),
            pointerStripWidth: 1,
            pointerStripUptoDataPoint: true,
            initialPointerIndex: Math.max(0, lineData.length - 1),
            persistPointer: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelWidth: 150,
            pointerLabelHeight: 72,
            shiftPointerLabelX: -96,
            shiftPointerLabelY: -8,
            pointerLabelComponent: (payload: unknown) => {
              const resolved = resolvePointerItem(payload);
              const item = resolved?.value !== undefined ? resolved : lineData[lineData.length - 1];
              if (!item || item.value === undefined || item.value === null) return null;
              return (
                <View
                  style={{
                    width: 150,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(63,63,70,0.9)",
                    backgroundColor: "#09090B",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#A1A1AA", textTransform: "uppercase" }}>
                    {item.label || "Value"}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 15, fontWeight: "800", color: "#F4F4F5" }}>
                    Value: {formatCurrency(item.value)}
                  </Text>
                </View>
              );
            },
          }}
        />
      </View>
    </View>
  );
}

type AllocationCardProps = {
  summary: InvestmentData["summary"] | undefined;
  hidden: boolean;
  colors: { primary: string; secondary: string; tertiary: string };
};

function AllocationCard({ summary, hidden, colors }: AllocationCardProps) {
  const [selectedSlice, setSelectedSlice] = useState(0);
  const allocationData = useMemo(
    () =>
      [
        { label: "Mutual Funds", value: summary?.mfFolioValue || 0, color: INVESTMENT_ALLOCATION_COLORS.mutualFunds },
        { label: "ETFs", value: summary?.mfDematValue || 0, color: INVESTMENT_ALLOCATION_COLORS.etfs },
        { label: "Stocks", value: summary?.equityValue || 0, color: INVESTMENT_ALLOCATION_COLORS.stocks },
      ].filter((item) => item.value > 0),
    [summary?.equityValue, summary?.mfDematValue, summary?.mfFolioValue],
  );

  const totalAllocation = allocationData.reduce((sum, item) => sum + item.value, 0);

  return (
    <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-6">
      <Text className="text-xs font-black uppercase tracking-[1.5px] text-zinc-500">Portfolio Allocation</Text>
      {hidden ? (
        <Text className="mt-5 text-xs font-black uppercase tracking-[1.5px] text-zinc-500">Allocation hidden for privacy</Text>
      ) : allocationData.length > 0 ? (
        <>
          {(() => {
            const pieData = allocationData.map<pieDataItem>((item, index) => ({
              value: item.value,
              color: item.color,
              text: `${Math.round((item.value / totalAllocation) * 100)}%`,
            }));
            const selected = allocationData[selectedSlice] || allocationData[0];
            return (
              <View className="mt-5 items-center justify-center">
                <PieChart
                  data={pieData}
                  donut
                  radius={78}
                  innerRadius={52}
                  extraRadius={3}
                  innerCircleColor="#0A0A0A"
                  strokeWidth={2}
                  strokeColor="#09090B"
                  onPress={(_item: pieDataItem, index: number) => setSelectedSlice(index)}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-zinc-500">{selected?.label}</Text>
                      <Text className="text-xs font-black" style={{ color: colors.primary }}>
                        {formatCurrency(selected?.value || 0)}
                      </Text>
                    </View>
                  )}
                />
              </View>
            );
          })()}

          <View className="mt-4 gap-2">
            {allocationData.map((item) => {
              const share = totalAllocation > 0 ? (item.value / totalAllocation) * 100 : 0;
              return (
                <View key={item.label} className="flex-row items-center justify-between rounded-2xl border border-zinc-800 bg-black/50 px-3 py-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <Text className="text-[10px] font-black uppercase tracking-[1.2px] text-zinc-500">{item.label}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-black" style={{ color: colors.primary }}>
                      {formatCurrency(item.value)}
                    </Text>
                    <Text className="text-[10px] font-bold text-zinc-500">{share.toFixed(2)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text className="mt-5 text-sm text-zinc-400">No allocation data available yet.</Text>
      )}
    </View>
  );
}

type SummaryCardProps = {
  title: string;
  subtitle: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  accentColor: string;
  onPress?: () => void;
};

function SummaryCard({ title, subtitle, value, icon, accentColor, onPress }: SummaryCardProps) {
  const { animatedStyle, onLayout, onPressIn, onPressOut } = useTiltPress();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} onLayout={onLayout}>
      <Animated.View style={[summaryCardStyles.cardWrap, animatedStyle]}>
        <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: withOpacity(accentColor, 0.18) }}>
                <Feather name={icon} size={22} color={accentColor} />
              </View>
              <View>
                <Text className="text-[18px] font-black tracking-tight text-zinc-100">{title}</Text>
                <Text className="text-[10px] font-black uppercase tracking-[1.4px] text-zinc-500">{subtitle}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-lg font-black" style={{ color: accentColor }}>
                {value}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

type EmailSyncCtaProps = {
  onLinkGmail: () => void;
  onLinkIcloud: () => void;
};

function EmailSyncCta({ onLinkGmail, onLinkIcloud }: EmailSyncCtaProps) {
  return (
    <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 p-5">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
          <Feather name="mail" size={18} color="#D4D4D8" />
        </View>
        <Text className="flex-1 text-[34px] leading-[38px] font-black tracking-tight text-zinc-100">Auto-sync with email</Text>
      </View>
      <Text className="mt-3 text-sm leading-6 text-zinc-400">Link your inbox to fetch latest CAS statements whenever you tap sync.</Text>
      <View className="mt-4 flex-row gap-3">
        <Pressable onPress={onLinkGmail} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
          <View className="flex-row items-center justify-center gap-2">
            <Feather name="mail" size={14} color="#E4E4E7" />
            <Text className="text-sm font-semibold text-zinc-200">Link Gmail</Text>
          </View>
        </Pressable>
        <Pressable onPress={onLinkIcloud} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
          <View className="flex-row items-center justify-center gap-2">
            <Feather name="cloud" size={14} color="#E4E4E7" />
            <Text className="text-sm font-semibold text-zinc-200">Link iCloud</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function InvestmentsScreen() {
  const { colors } = useColorTheme();
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
  const hasData = !!summary && summary.totalValue > 0;

  const handleSavePan = async () => {
    try {
      const savedPan = await savePan({ pan: currentPan }).unwrap();
      setPanInput(savedPan);
      Toast.show({
        type: "success",
        text1: "PAN saved",
      });
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({
        type: "error",
        text1: "Could not save PAN",
        text2: apiError?.data?.message || "Please enter a valid PAN number.",
      });
    }
  };

  const handleSync = async () => {
    if (!isEmailLinked || !hasPan) return;
    try {
      const result = await syncInvestments().unwrap();
      Toast.show({
        type: "success",
        text1: result.alreadySynced ? "Up to date" : "Sync complete",
        text2: result.message,
      });
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: apiError?.data?.message || "Could not sync investments.",
      });
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <Text
            className="text-zinc-100"
            style={{ color: colors.primary, fontSize: 34, lineHeight: 38, fontFamily: DISPLAY_FONT_FAMILY, fontWeight: "700" }}
          >
            Investments
          </Text>

          {isEmailLinked && hasPan ? (
            <Pressable
              onPress={handleSync}
              disabled={isSyncing}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: isSyncing ? withOpacity(colors.primary, 0.25) : withOpacity(colors.primary, 0.12) }}
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
          {isLinkedAccountsLoading || isPanLoading || isInvestmentsLoading ? (
            <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#D4D4D8" />
                <Text className="text-sm text-zinc-300">Loading investments...</Text>
              </View>
            </View>
          ) : !hasPan ? (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView
                className="mt-6"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={{ paddingBottom: 220 }}
              >
                <PanGateCard
                  currentPan={currentPan}
                  panValid={panValid}
                  isSavingPan={isSavingPan}
                  onPanChange={(value) => setPanInput(sanitizePan(value))}
                  onSave={handleSavePan}
                  primaryColor={colors.primary}
                  onTopOfPrimary={colors.onTopOfPrimary}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <ScrollView className="mt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 140 }}>
              {!isEmailLinked ? (
                <EmailSyncCta
                  onLinkGmail={() =>
                    navigation.navigate("EmailCredentials", {
                      mode: "create",
                      provider: "gmail",
                    })
                  }
                  onLinkIcloud={() =>
                    navigation.navigate("EmailCredentials", {
                      mode: "create",
                      provider: "icloud",
                    })
                  }
                />
              ) : null}
                <View className="rounded-[28px] border border-zinc-800 bg-zinc-950 p-5">
                  {!!investments?.statementPeriod && (
                    <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-zinc-500">
                      Statement period: {investments.statementPeriod}
                    </Text>
                  )}

                  <Text className="mt-4 text-xs font-black uppercase tracking-[1.5px] text-zinc-500">Total value</Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-[38px] font-black tracking-tight" style={{ color: colors.primary }}>
                      {hideValues ? "••••••••" : formatCurrency(summary?.totalValue || 0)}
                    </Text>
                    <Pressable
                      onPress={() => setHideValues((prev) => !prev)}
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: withOpacity(colors.primary, 0.12) }}
                    >
                      <Feather name={hideValues ? "eye-off" : "eye"} size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>

                <View className="flex-row items-center justify-between px-1">
                  <Text className="text-lg font-black text-zinc-100">Your summary</Text>
                </View>

                {hasData ? (
                  <>
                    <SummaryCard
                      title="Mutual Funds"
                      subtitle={`${investments?.mutualFunds.length || 0} funds`}
                      value={hideValues ? "••••••" : formatCurrency((summary?.mfFolioValue || 0) + (summary?.mfDematValue || 0))}
                      icon="layers"
                      accentColor={colors.primary}
                      onPress={() => navigation.navigate("MutualFunds")}
                    />

                    <SummaryCard
                      title="Stocks"
                      subtitle={`${investments?.stocks.length || 0} stocks`}
                      value={hideValues ? "••••••" : formatCurrency(summary?.equityValue || 0)}
                      icon="trending-up"
                      accentColor={colors.primary}
                      onPress={() => navigation.navigate("Stocks")}
                    />

                    <HistoricalGrowthCard data={investments?.historicalValuation || []} hidden={hideValues} lineColor={colors.primary} />
                    <AllocationCard summary={summary} hidden={hideValues} colors={colors} />
                  </>
                ) : (
                  <View className="items-center justify-center rounded-[28px] border border-dashed border-zinc-700 bg-zinc-950 px-6 py-14">
                    <Feather name="trending-up" size={24} color={withOpacity(colors.primary, 0.55)} />
                    <Text className="mt-4 text-base font-semibold text-zinc-200">No investment data yet</Text>
                    <Text className="mt-2 text-center text-sm text-zinc-400">Tap Sync to fetch your latest CAS statement.</Text>
                  </View>
                )}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const summaryCardStyles = StyleSheet.create({
  cardWrap: {
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
