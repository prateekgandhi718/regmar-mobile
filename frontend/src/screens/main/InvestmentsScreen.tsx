import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { FiyLogo } from "@/components/fiy-logo";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import type { HistoricalValuation } from "@/lib/investments-types";
import { isValidPan, sanitizePan } from "@/lib/investments-storage";
import { useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useGetInvestmentPanQuery, useGetMyInvestmentsQuery, useSaveInvestmentPanMutation } from "@/redux/api/investmentsApi";
import { useSyncInvestmentsMutation } from "@/redux/api/syncApi";
import { withOpacity } from "@/theme/color-theme";

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const HistoricalChart = ({
  data,
  hidden,
  color,
}: {
  data: HistoricalValuation[];
  hidden: boolean;
  color: string;
}) => {
  if (!data.length) return null;

  if (hidden) {
    return (
      <View className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <Text className="text-xs font-black uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
          Chart hidden for privacy
        </Text>
      </View>
    );
  }

  const values = data.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 280;
  const height = 140;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((item, index) => {
      const x = index * step;
      const y = max === min ? height / 2 : ((max - item.value) / (max - min)) * (height - 12) + 6;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <Text className="mb-4 text-xs font-black uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
        Portfolio Growth
      </Text>
      <View className="items-center">
        <Svg width={width} height={height}>
          <Polyline points={points} fill="none" stroke={color} strokeWidth={3} />
        </Svg>
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
          {data[0]?.monthYear.split(" ")[0]}
        </Text>
        <Text className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
          {data[data.length - 1]?.monthYear.split(" ")[0]}
        </Text>
      </View>
    </View>
  );
};

export function InvestmentsScreen() {
  const { colors } = useColorTheme();
  const [hideValues, setHideValues] = useState(false);
  const [panInput, setPanInput] = useState("");

  const { data: linkedAccounts, isLoading: isLinkedAccountsLoading } = useGetLinkedAccountsQuery();
  const { data: storedPan, isLoading: isPanLoading } = useGetInvestmentPanQuery();
  const { data: investments, isLoading: isInvestmentsLoading } = useGetMyInvestmentsQuery();
  const [savePan, { isLoading: isSavingPan }] = useSaveInvestmentPanMutation();
  const [syncInvestments, { isLoading: isSyncing }] = useSyncInvestmentsMutation();

  const isEmailLinked = !!linkedAccounts?.some((account) => account.isActive);
  const currentPan = sanitizePan(panInput || storedPan || "");
  const hasPan = isValidPan(storedPan || "");
  const summary = investments?.summary;
  const hasData = !!summary && summary.totalValue > 0;
  const allocationData = useMemo(
    () =>
      [
        { label: "Mutual Funds", value: summary?.mfFolioValue || 0, color: colors.primary },
        { label: "ETFs", value: summary?.mfDematValue || 0, color: colors.secondary },
        { label: "Stocks", value: summary?.equityValue || 0, color: colors.tertiary },
      ].filter((item) => item.value > 0),
    [colors.primary, colors.secondary, colors.tertiary, summary?.equityValue, summary?.mfDematValue, summary?.mfFolioValue],
  );

  const totalAllocation = allocationData.reduce((sum, item) => sum + item.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let segmentOffset = 0;

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
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <FiyLogo size={30} />
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
              INVESTMENTS
            </Text>
          </View>
          {isEmailLinked && hasPan ? (
            <Pressable
              onPress={handleSync}
              disabled={isSyncing}
              className="rounded-xl px-3 py-2"
              style={{
                backgroundColor: isSyncing
                  ? withOpacity(colors.primary, 0.25)
                  : withOpacity(colors.primary, 0.12),
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

        <View className="flex-1 px-6 pb-32 pt-6">
          <EmailLinkGate
            title="Link email to see all your investments"
            description="Connect your inbox to fetch CAS and broker mails so you can track investments and optimize your stock portfolio."
          >
            {isLinkedAccountsLoading || isPanLoading || isInvestmentsLoading ? (
              <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" />
                  <Text className="text-sm text-zinc-600 dark:text-zinc-300">Loading investments...</Text>
                </View>
              </View>
            ) : !hasPan ? (
              <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <View className="items-center">
                  <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950">
                    <Feather name="shield" size={24} color={colors.primary} />
                  </View>
                  <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Unlock your Portfolio</Text>
                  <Text className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-300">
                    Enter PAN to decrypt and read your investment statements.
                  </Text>
                </View>

                <View className="mt-6 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
                  <Text className="text-xs font-bold uppercase tracking-[1.4px] text-zinc-500 dark:text-zinc-400">PAN</Text>
                  <TextInput
                    value={currentPan}
                    onChangeText={(value) => setPanInput(sanitizePan(value))}
                    placeholder="ABCDE1234F"
                    placeholderTextColor="#71717a"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    className="mt-1 text-right text-xl font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </View>

                <Pressable
                  onPress={handleSavePan}
                  disabled={isSavingPan || !isValidPan(currentPan)}
                  className="mt-5 items-center rounded-2xl px-4 py-4"
                  style={{ backgroundColor: isValidPan(currentPan) ? colors.primary : withOpacity(colors.primary, 0.4) }}
                >
                  {isSavingPan ? (
                    <ActivityIndicator size="small" color={colors.onTopOfPrimary} />
                  ) : (
                    <Text className="text-sm font-black uppercase" style={{ color: colors.onTopOfPrimary }}>
                      Save & Continue
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <ScrollView
                className="mt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
              >
                <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  {!!investments?.statementPeriod && (
                    <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
                      Statement period: {investments.statementPeriod}
                    </Text>
                  )}
                  <Text className="mt-4 text-xs font-black uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
                    Total value
                  </Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-3xl font-black tracking-tight" style={{ color: colors.primary }}>
                      {hideValues ? "••••••••" : formatCurrency(summary?.totalValue || 0)}
                    </Text>
                    <Pressable
                      onPress={() => setHideValues((prev) => !prev)}
                      className="h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: withOpacity(colors.primary, 0.1) }}
                    >
                      <Feather name={hideValues ? "eye-off" : "eye"} size={15} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>

                {hasData ? (
                  <>
                    <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-base font-black text-zinc-900 dark:text-zinc-100">Mutual Funds</Text>
                          <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-zinc-500 dark:text-zinc-400">
                            {investments?.mutualFunds.length || 0} funds
                          </Text>
                        </View>
                        <Text className="text-lg font-black" style={{ color: colors.primary }}>
                          {hideValues ? "••••••" : formatCurrency((summary?.mfFolioValue || 0) + (summary?.mfDematValue || 0))}
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-base font-black text-zinc-900 dark:text-zinc-100">Stocks</Text>
                          <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-zinc-500 dark:text-zinc-400">
                            {investments?.stocks.length || 0} stocks
                          </Text>
                        </View>
                        <Text className="text-lg font-black" style={{ color: colors.primary }}>
                          {hideValues ? "••••••" : formatCurrency(summary?.equityValue || 0)}
                        </Text>
                      </View>
                    </View>

                    <HistoricalChart data={investments?.historicalValuation || []} hidden={hideValues} color={colors.primary} />

                    <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                      <Text className="mb-4 text-xs font-black uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
                        Portfolio Allocation
                      </Text>
                      {hideValues ? (
                        <Text className="text-xs font-black uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
                          Allocation hidden for privacy
                        </Text>
                      ) : (
                        <>
                          <View className="items-center justify-center">
                            <Svg width={150} height={150}>
                              <Circle
                                cx="75"
                                cy="75"
                                r={radius}
                                stroke={withOpacity(colors.primary, 0.12)}
                                strokeWidth={22}
                                fill="none"
                              />
                              {allocationData.map((item) => {
                                const fraction = totalAllocation > 0 ? item.value / totalAllocation : 0;
                                const arcLength = circumference * fraction;
                                const rendered = (
                                  <Circle
                                    key={item.label}
                                    cx="75"
                                    cy="75"
                                    r={radius}
                                    stroke={item.color}
                                    strokeWidth={22}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={`${arcLength} ${circumference}`}
                                    strokeDashoffset={-segmentOffset}
                                    transform="rotate(-90 75 75)"
                                  />
                                );
                                segmentOffset += arcLength;
                                return rendered;
                              })}
                            </Svg>
                          </View>

                          <View className="mt-4 gap-2">
                            {allocationData.map((item) => (
                              <View
                                key={item.label}
                                className="flex-row items-center justify-between rounded-2xl border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                              >
                                <View className="flex-row items-center gap-2">
                                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                  <Text className="text-xs font-bold uppercase tracking-[1.2px] text-zinc-500 dark:text-zinc-400">
                                    {item.label}
                                  </Text>
                                </View>
                                <Text className="text-sm font-black" style={{ color: colors.primary }}>
                                  {formatCurrency(item.value)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </>
                      )}
                    </View>
                  </>
                ) : (
                  <View className="items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-14 dark:border-zinc-700 dark:bg-zinc-900">
                    <Feather name="trending-up" size={22} color={withOpacity(colors.primary, 0.5)} />
                    <Text className="mt-3 text-base font-semibold text-zinc-700 dark:text-zinc-200">
                      No investment data yet
                    </Text>
                    <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      Tap Sync to fetch your latest CAS statement.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </EmailLinkGate>
        </View>
      </View>
    </SafeAreaView>
  );
}
