import { useEffect, useMemo, useRef, useState } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { CategoryIcon } from "@/components/category-icon";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useUpdateTransactionMutation } from "@/redux/api/transactionsApi";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "TransactionNeedCheckIn">;
type NeedKey = "protection" | "fuel" | "connection" | "freedom";
type SpendForOption = "Need" | "Love" | "Like" | "Want";

type NeedCircle = {
  key: NeedKey;
  moodState: string;
  lineA: string;
  lineB: string;
  layers: [string, string, string];
};

const SPEND_FOR_OPTIONS: SpendForOption[] = ["Need", "Love", "Like", "Want"];
const SPEND_FOR_CHOICES: Array<{
  key: SpendForOption;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
}> = [
  {
    key: "Need",
    label: "Needs",
    icon: "shield-lock-outline",
    description: "It was an absolute safety/survival necessity.",
  },
  {
    key: "Love",
    label: "Loves",
    icon: "heart-multiple",
    description: "This will bring me deep joy a year from now.",
  },
  {
    key: "Want",
    label: "Wants",
    icon: "lightning-bolt-circle",
    description: "Instant gratification, honestly.",
  },
  {
    key: "Like",
    label: "Likes",
    icon: "star-circle-outline",
    description: "This is a nice-to-have, temporary treat.",
  },
];

const MOOD_CIRCLES: NeedCircle[] = [
  {
    key: "protection",
    moodState: "Anxious/Angry/Frustrated",
    lineA: "Anxious/Angry",
    lineB: "Frustrated",
    layers: ["#D84236", "#FF7A45", "#FF4F67"],
  },
  {
    key: "fuel",
    moodState: "Excited/Inspired/Joyful",
    lineA: "Excited/Inspired",
    lineB: "Joyful",
    layers: ["#D0AF45", "#ECD86A", "#FBC12F"],
  },
  {
    key: "connection",
    moodState: "Bored/Exhausted/Depressed",
    lineA: "Bored/Exhausted",
    lineB: "Depressed",
    layers: ["#6D86D4", "#89B7E9", "#789CF3"],
  },
  {
    key: "freedom",
    moodState: "Calm/Content/Relaxed",
    lineA: "Calm/Content",
    lineB: "Relaxed",
    layers: ["#46BC88", "#7EE2AB", "#5EDAAF"],
  },
];

const amountToLabel = (amount: number, type: "credit" | "debit") =>
  `${type === "debit" ? "-" : "+"}₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function TransactionNeedCheckInScreen({ navigation, route }: Props) {
  const { transaction } = route.params;
  const existingNeedSelection = transaction.needSelection;
  const [updateTransaction, { isLoading: isSaving }] = useUpdateTransactionMutation();

  const circles = MOOD_CIRCLES;

  const [selectedNeedKey, setSelectedNeedKey] = useState<NeedKey | null>(
    (existingNeedSelection?.key as NeedKey | undefined) ?? null,
  );
  const previousSpendFor = existingNeedSelection?.spendFor;
  const [selectedSpendFor, setSelectedSpendFor] = useState<SpendForOption | null>(
    previousSpendFor && SPEND_FOR_OPTIONS.includes(previousSpendFor as SpendForOption)
      ? (previousSpendFor as SpendForOption)
      : null,
  );

  const selectedNeed = useMemo(
    () => circles.find((item) => item.key === selectedNeedKey) || null,
    [circles, selectedNeedKey],
  );
  const scrollRef = useRef<ScrollView | null>(null);
  const [spendSectionY, setSpendSectionY] = useState<number | null>(null);
  const didSelectMoodRef = useRef(false);

  useEffect(() => {
    if (!didSelectMoodRef.current) return;
    if (!selectedNeedKey || spendSectionY === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(spendSectionY - 16, 0), animated: true });
  }, [selectedNeedKey, spendSectionY]);

  const onSelectNeedGroup = (key: NeedKey) => {
    didSelectMoodRef.current = true;
    setSelectedNeedKey(key);
    setSelectedSpendFor(null);
  };

  const handleComplete = async () => {
    if (!selectedNeed || !selectedSpendFor) return;
    try {
      await updateTransaction({
        clientTxnId: transaction.clientTxnId,
        needSelection: {
          key: selectedNeed.key,
          moodState: selectedNeed.moodState,
          spendFor: selectedSpendFor,
          color: selectedNeed.layers[2],
          completedAt: new Date().toISOString(),
        },
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      const apiError = error as { data?: { message?: string }; error?: string };
      Toast.show({
        type: "error",
        text1: "Could not save reflection",
        text2: apiError?.data?.message || apiError?.error || "Please try again.",
      });
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Feather name="x" size={28} color="#E4E4E7" />
          </Pressable>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Pick the color which best describes how you felt</Text>

          <View style={styles.transactionMetaCard}>
            <View style={styles.transactionMetaLeft}>
              <View style={styles.categoryIconWrap}>
                <CategoryIcon name={transaction.categoryName} size={18} color={transaction.needSelection?.color || "#D4D4D8"} />
              </View>
              <View style={styles.transactionMetaTextWrap}>
                <Text numberOfLines={1} style={styles.merchant}>{transaction.merchant.toUpperCase()}</Text>
                <Text style={styles.accountText}>{(transaction.accountTitle || "ACCOUNT").toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.amount}>{amountToLabel(transaction.amount, transaction.type)}</Text>
          </View>

          <View style={styles.colorGrid}>
            {circles.map((item, index) => (
              <NeedCircleBlob
                key={item.key}
                lineA={item.lineA}
                lineB={item.lineB}
                layers={item.layers}
                groupIndex={index}
                selected={selectedNeedKey === item.key}
                onPress={() => onSelectNeedGroup(item.key)}
              />
            ))}
          </View>

          {selectedNeed ? (
            <View style={styles.section} onLayout={(event) => setSpendSectionY(event.nativeEvent.layout.y)}>
              <Text style={styles.sectionTitle}>What was this spend for?</Text>
              <View style={styles.spendIconGrid}>
                {SPEND_FOR_CHOICES.map((item) => {
                  const active = selectedSpendFor === item.key;
                  return (
                    <View key={item.key} style={styles.spendOptionItem}>
                      <Pressable
                        onPress={() => setSelectedSpendFor(item.key)}
                        style={[styles.spendIconButton, active ? styles.spendIconButtonActive : null]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={56}
                          color={active ? "#F4F4F5" : "#A1A1AA"}
                        />
                        <Text style={styles.spendOptionLabel}>{item.label}</Text>
                      </Pressable>
                      <Text style={styles.spendOptionDescription}>{item.description}</Text>
                    </View>
                  );
                })}
              </View>
              <Pressable
                onPress={handleComplete}
                disabled={isSaving || !selectedSpendFor}
                style={[
                  styles.completeButton,
                  {
                    backgroundColor: selectedNeed.layers[2],
                    opacity: isSaving || !selectedSpendFor ? 0.72 : 1,
                  },
                ]}
              >
                <Text style={styles.completeButtonText}>
                  {isSaving ? "Saving..." : "Save this reflection"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

type NeedCircleBlobProps = {
  lineA: string;
  lineB: string;
  layers: [string, string, string];
  groupIndex: number;
  selected: boolean;
  onPress: () => void;
};

function NeedCircleBlob({ lineA, lineB, layers, groupIndex, selected, onPress }: NeedCircleBlobProps) {
  const spinA = useRef(new Animated.Value(0)).current;
  const spinB = useRef(new Animated.Value(0)).current;
  const spinC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const groupDelay = groupIndex * 700;
    const loopA = Animated.loop(
      Animated.timing(spinA, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const loopB = Animated.loop(
      Animated.timing(spinB, {
        toValue: 1,
        duration: 20400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const loopC = Animated.loop(
      Animated.timing(spinC, {
        toValue: 1,
        duration: 22800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinA.setValue(0);
    spinB.setValue(0);
    spinC.setValue(0);

    const timer = setTimeout(() => {
      loopA.start();
      loopB.start();
      loopC.start();
    }, groupDelay);
    return () => {
      clearTimeout(timer);
      loopA.stop();
      loopB.stop();
      loopC.stop();
    };
  }, [groupIndex, spinA, spinB, spinC]);

  const rotateA = spinA.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const rotateB = spinB.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] });
  const rotateC = spinC.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Pressable onPress={onPress} style={styles.circleWrap}>
      <View style={[styles.circleOuter, selected ? { borderColor: `${layers[2]}E6`, borderWidth: 2 } : null]}>
        <Animated.View
          style={[
            styles.circleLayer,
            {
              backgroundColor: layers[0],
              transform: [{ rotate: rotateA }, { translateX: 10 }, { translateY: -8 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circleLayer,
            {
              backgroundColor: layers[1],
              transform: [{ rotate: rotateB }, { translateX: -12 }, { translateY: 10 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circleLayer,
            {
              backgroundColor: layers[2],
              transform: [{ rotate: rotateC }, { translateX: 6 }, { translateY: 12 }],
            },
          ]}
        />
        <View style={styles.circleTextWrap}>
          <Text style={styles.circleText}>{lineA}</Text>
          {lineB ? <Text style={styles.circleText}>{lineB}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  iconButton: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(39,39,42,0.5)",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 44,
  },
  title: {
    color: "#F4F4F5",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  merchant: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  amount: {
    color: "#F4F4F5",
    fontSize: 16,
    fontWeight: "800",
  },
  transactionMetaCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(24,24,27,0.52)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  transactionMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionMetaTextWrap: {
    flex: 1,
  },
  accountText: {
    marginTop: 2,
    color: "#A1A1AA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  colorGrid: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  circleWrap: {
    width: "48.5%",
    alignItems: "center",
    marginBottom: 8,
  },
  circleOuter: {
    width: 192,
    height: 192,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  circleLayer: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 999,
    top: 8,
    left: 8,
    opacity: 0.9,
  },
  circleTextWrap: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    gap: 2,
  },
  circleText: {
    color: "#0A0A0A",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "700",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "#F4F4F5",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  spendIconGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  spendIconButton: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  spendIconButtonActive: {
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  spendOptionLabel: {
    color: "#F4F4F5",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  completeButton: {
    marginTop: 28,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  completeButtonText: {
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  spendOptionItem: {
    width: "48.5%",
    alignItems: "center",
    marginBottom: 8,
  },
  spendOptionDescription: {
    marginTop: 8,
    color: "#D4D4D8",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    width: "100%",
    minHeight: 48,
  },
});
