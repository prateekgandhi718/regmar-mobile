import { useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { NeedCheckInOrb } from "@/components/transactions/NeedCheckInOrb";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useGetLinkedAccountsQuery } from "@/redux/api/linkedAccountsApi";
import { useSyncTransactionsMutation } from "@/redux/api/syncApi";
import { useGetTransactionsQuery } from "@/redux/api/transactionsApi";
import type { Transaction } from "@/lib/transactions-types";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const formatAmount = (amount: number) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getEffectiveDate = (tx: Transaction) => new Date(tx.newDate || tx.originalDate);
const getEffectiveAmount = (tx: Transaction) => tx.newAmount ?? tx.originalAmount;
const isDebitTransaction = (tx: Transaction) => (tx.userType || tx.type) === "debit";

const formatCardDate = (date: Date) => {
  const dateLine = date.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLine = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { dateLine, timeLine };
};

const getMerchantName = (tx: Transaction) => {
  const description = (tx.newDescription || tx.originalDescription || "Unknown Merchant").trim();
  return description;
};

const NEED_CARD_THEMES: Record<
  "protection" | "fuel" | "connection" | "freedom",
  { border: string; bg: string; orbLarge: string; orbSmall: string }
> = {
  protection: {
    border: "rgba(216,66,54,0.55)",
    bg: "#2A1011",
    orbLarge: "rgba(255,79,103,0.32)",
    orbSmall: "rgba(255,122,69,0.24)",
  },
  fuel: {
    border: "rgba(208,175,69,0.55)",
    bg: "#292110",
    orbLarge: "rgba(251,193,47,0.3)",
    orbSmall: "rgba(236,216,106,0.22)",
  },
  connection: {
    border: "rgba(109,134,212,0.55)",
    bg: "#11192A",
    orbLarge: "rgba(120,156,243,0.32)",
    orbSmall: "rgba(137,183,233,0.24)",
  },
  freedom: {
    border: "rgba(70,188,136,0.55)",
    bg: "#0F241E",
    orbLarge: "rgba(94,218,175,0.3)",
    orbSmall: "rgba(126,226,171,0.24)",
  },
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => `${c}${c}`).join("") : normalized;
  if (full.length !== 6) return `rgba(255,255,255,${alpha})`;
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const buildNeedThemeFromColor = (color: string) => ({
  border: hexToRgba(color, 0.55),
  bg: "#101013",
  orbLarge: hexToRgba(color, 0.32),
  orbSmall: hexToRgba(color, 0.2),
});

const getNeedBackdropShapeStyle = (
  needKey: "protection" | "fuel" | "connection" | "freedom",
  size: "large" | "small",
) => {
  const isLarge = size === "large";
  if (needKey === "protection") {
    return {
      borderRadius: isLarge ? 28 : 22,
      transform: [{ rotate: "45deg" }],
    } as const;
  }
  if (needKey === "fuel") {
    return {
      borderRadius: isLarge ? 34 : 28,
    } as const;
  }
  if (needKey === "connection") {
    return {
      borderRadius: 999,
      borderTopRightRadius: isLarge ? 26 : 18,
      borderBottomRightRadius: isLarge ? 26 : 18,
      borderTopLeftRadius: 999,
      borderBottomLeftRadius: 999,
    } as const;
  }
  return {
    borderTopLeftRadius: isLarge ? 88 : 62,
    borderTopRightRadius: isLarge ? 88 : 62,
    borderBottomLeftRadius: isLarge ? 88 : 62,
    borderBottomRightRadius: isLarge ? 30 : 22,
  } as const;
};

export function TransactionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useColorTheme();
  const [syncTransactions, { isLoading: isSyncing }] = useSyncTransactionsMutation();
  const { data: linkedAccounts, isLoading: isLinkedLoading } = useGetLinkedAccountsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: transactions = [], isLoading: isTransactionsLoading } = useGetTransactionsQuery();

  const isEmailLinked = linkedAccounts?.some((acc) => acc.isActive);
  const hasAccountWithDomain = accounts.some((acc) => Array.isArray(acc.domainIds) && acc.domainIds.length > 0);

  const sortedTransactions = useMemo(() => {
    return [...transactions]
      .filter((tx) => !tx.refunded)
      .sort((a, b) => getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime());
  }, [transactions]);

  const handleSync = async () => {
    if (!isEmailLinked || !hasAccountWithDomain) return;
    try {
      const result = await syncTransactions().unwrap();
      Toast.show({
        type: "success",
        text1: "Sync complete",
        text2: `${result.transactionsSynced} transactions synced`,
      });
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: apiError?.data?.message || "Could not sync transactions.",
      });
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <Text style={styles.headingText}>Transactions</Text>
          {isEmailLinked && hasAccountWithDomain ? (
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

        <View className="flex-1 px-4 pt-6">
          {isLinkedLoading || isTransactionsLoading ? (
            <View style={styles.infoCard}>
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#D4D4D8" />
                <Text className="text-sm text-zinc-300">Loading transactions...</Text>
              </View>
            </View>
          ) : !isEmailLinked ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Email not linked</Text>
              <Text style={styles.infoDescription}>
                Link your inbox in onboarding/settings to sync transactions.
              </Text>
            </View>
          ) : !hasAccountWithDomain ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Account setup pending</Text>
              <Text style={styles.infoDescription}>
                Add at least one account with sender domains to enable syncing.
              </Text>
            </View>
          ) : sortedTransactions.length === 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>No transactions yet</Text>
              <Text style={styles.infoDescription}>Tap Sync to pull your latest transactions.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 148 }}>
              {sortedTransactions.map((tx) => {
                const amount = getEffectiveAmount(tx);
                const date = getEffectiveDate(tx);
                const { dateLine, timeLine } = formatCardDate(date);
                const isDebit = isDebitTransaction(tx);
                const merchant = getMerchantName(tx);

                return (
                  <TransactionCard
                    key={tx.clientTxnId}
                    transaction={tx}
                    dateLine={dateLine}
                    timeLine={timeLine}
                    amount={amount}
                    isDebit={isDebit}
                    merchant={merchant}
                    accountTitle={tx.accountId.title}
                    onOpenNeedCheckIn={() =>
                      navigation.navigate("TransactionNeedCheckIn", {
                        transaction: {
                          clientTxnId: tx.clientTxnId,
                          merchant,
                          amount,
                          type: isDebit ? "debit" : "credit",
                          date: date.toISOString(),
                          needSelection: tx.needSelection,
                        },
                      })
                    }
                  />
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

type TransactionCardProps = {
  transaction: Transaction;
  dateLine: string;
  timeLine: string;
  amount: number;
  isDebit: boolean;
  merchant: string;
  accountTitle: string;
  onOpenNeedCheckIn: () => void;
};

function TransactionCard({
  transaction,
  dateLine,
  timeLine,
  amount,
  isDebit,
  merchant,
  accountTitle,
  onOpenNeedCheckIn,
}: TransactionCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const [cardSize, setCardSize] = useState({ width: 1, height: 1 });
  const needKey = transaction.needSelection?.key;
  const needTheme = transaction.needSelection?.color
    ? buildNeedThemeFromColor(transaction.needSelection.color)
    : transaction.needSelection?.key
      ? NEED_CARD_THEMES[transaction.needSelection.key]
      : null;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCardSize({ width, height });
    }
  };

  const animateReset = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }),
      Animated.spring(tiltX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  };

  const animatePressAt = (locationX: number, locationY: number) => {
    const xRatio = (locationX / cardSize.width - 0.5) * 2;
    const yRatio = (locationY / cardSize.height - 0.5) * 2;
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(tiltX, { toValue: -yRatio * 2.3, useNativeDriver: true, speed: 24, bounciness: 3 }),
      Animated.spring(tiltY, { toValue: xRatio * 2.3, useNativeDriver: true, speed: 24, bounciness: 3 }),
    ]).start();
  };

  const handlePressIn = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = event.nativeEvent;
    animatePressAt(locationX, locationY);
  };

  const handlePlusPressIn = () => {
    // Approximate touch anchor near bottom-right where the plus affordance lives.
    animatePressAt(cardSize.width - 28, cardSize.height - 28);
  };

  const cardAnimatedStyle = {
    transform: [
      { perspective: 900 },
      {
        rotateX: tiltX.interpolate({
          inputRange: [-8, 8],
          outputRange: ["-8deg", "8deg"],
        }),
      },
      {
        rotateY: tiltY.interpolate({
          inputRange: [-8, 8],
          outputRange: ["-8deg", "8deg"],
        }),
      },
      { scale },
    ],
  } as const;

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={animateReset} onLayout={handleLayout}>
      <Animated.View
        style={[
          styles.transactionCard,
          needTheme
            ? { borderColor: needTheme.border, backgroundColor: needTheme.bg }
            : null,
          cardAnimatedStyle,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.glowOrbLarge,
            needTheme ? { backgroundColor: needTheme.orbLarge } : null,
            needKey ? getNeedBackdropShapeStyle(needKey, "large") : null,
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.glowOrbSmall,
            needTheme ? { backgroundColor: needTheme.orbSmall } : null,
            needKey ? getNeedBackdropShapeStyle(needKey, "small") : null,
          ]}
        />

        <View className="flex-row items-start justify-between">
          <View>
            <Text style={styles.dateText}>{dateLine}</Text>
            <Text style={styles.dateText}>{timeLine}</Text>
          </View>
          <View
            style={[
              styles.amountBadge,
              styles.amountBadgeNeutral,
            ]}
          >
            <Text style={styles.amountBadgeText}>
              {isDebit ? "-" : "+"}₹{formatAmount(amount)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleBlock}>
            <Text numberOfLines={2} style={styles.merchantLine}>
              {merchant}
            </Text>
            <Text style={styles.accountLine}>{accountTitle}</Text>
          </View>
          <NeedCheckInOrb
            onPress={onOpenNeedCheckIn}
            onPressIn={handlePlusPressIn}
            onPressOut={animateReset}
            needSelection={transaction.needSelection}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headingText: {
    fontSize: 34,
    lineHeight: 38,
    color: "#F4F4F5",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  infoCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(24,24,27,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  infoTitle: {
    color: "#F4F4F5",
    fontSize: 17,
    fontWeight: "700",
  },
  infoDescription: {
    marginTop: 8,
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
  },
  transactionCard: {
    minHeight: 162,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#101013",
  },
  glowOrbLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -60,
    bottom: -80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glowOrbSmall: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 999,
    right: 36,
    top: -82,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dateText: {
    color: "#D4D4D8",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  amountBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(9,9,11,0.42)",
  },
  amountBadgeNeutral: {
    borderColor: "rgba(255,255,255,0.25)",
  },
  amountBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E4E4E7",
  },
  cardBody: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  merchantLine: {
    marginTop: 2,
    fontSize: 19,
    lineHeight: 23,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
    color: "#F4F4F5",
  },
  accountLine: {
    marginTop: 8,
    color: "#A1A1AA",
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
});
