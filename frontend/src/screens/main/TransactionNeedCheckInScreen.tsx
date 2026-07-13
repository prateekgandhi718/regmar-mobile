import { useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { CategoryIcon } from "@/components/category-icon";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetNeedsQuery } from "@/redux/api/needsApi";
import { useUpdateTransactionMutation } from "@/redux/api/transactionsApi";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "TransactionNeedCheckIn">;
type NeedKey = "protection" | "fuel" | "connection" | "freedom";

type NeedCircle = {
  key: NeedKey;
  label: string;
  lineA: string;
  lineB: string;
  layers: [string, string, string];
  words: string[];
  withOptions: string[];
  whereOptions: string[];
};

const FALLBACK_CIRCLES: NeedCircle[] = [
  {
    key: "protection",
    label: "High Urgency External",
    lineA: "High Urgency",
    lineB: "External",
    layers: ["#D84236", "#FF7A45", "#FF4F67"],
    words: ["Shelter", "Security", "Emergency", "Stability", "Preparedness", "Assurance", "Care", "Reliability"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
  },
  {
    key: "fuel",
    label: "High Urgency Internal",
    lineA: "High Urgency",
    lineB: "Internal",
    layers: ["#D0AF45", "#ECD86A", "#FBC12F"],
    words: ["Nourishment", "Energy", "Healing", "Recovery", "Hydration", "Strength", "Vitality", "Restoration"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
  },
  {
    key: "connection",
    label: "Low Urgency External",
    lineA: "Low Urgency",
    lineB: "External",
    layers: ["#6D86D4", "#89B7E9", "#789CF3"],
    words: ["Belonging", "Status", "Kindness", "Recognition", "Love", "Friendship", "Celebration", "Support"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
  },
  {
    key: "freedom",
    label: "Low Urgency Internal",
    lineA: "Low Urgency",
    lineB: "Internal",
    layers: ["#46BC88", "#7EE2AB", "#5EDAAF"],
    words: ["Time", "Organized", "Unwinding", "Calm", "Simplicity", "Choice", "Ease", "Autonomy"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
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
  const { data: needsFromApi = [] } = useGetNeedsQuery();
  const [updateTransaction, { isLoading: isSaving }] = useUpdateTransactionMutation();

  const circles = useMemo<NeedCircle[]>(() => {
    if (!needsFromApi.length) return FALLBACK_CIRCLES;
    const normalized = needsFromApi
      .map((need) => ({
        key: need.key,
        label: need.label,
        lineA: need.lineA,
        lineB: need.lineB,
        layers: need.layers,
        words: need.words,
        withOptions: need.withOptions,
        whereOptions: need.whereOptions,
        sortOrder: need.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return normalized as NeedCircle[];
  }, [needsFromApi]);

  const [selectedNeedKey, setSelectedNeedKey] = useState<NeedKey | null>(
    (existingNeedSelection?.key as NeedKey | undefined) ?? null,
  );
  const [selectedWord, setSelectedWord] = useState<string | null>(existingNeedSelection?.word ?? null);
  const [selectedWithOption, setSelectedWithOption] = useState<string | null>(existingNeedSelection?.contextWith ?? null);
  const [selectedWhereOption, setSelectedWhereOption] = useState<string | null>(existingNeedSelection?.contextWhere ?? null);

  const scrollRef = useRef<ScrollView | null>(null);
  const [wordSectionY, setWordSectionY] = useState<number | null>(null);
  const [contextSectionY, setContextSectionY] = useState<number | null>(null);
  const didSelectNeedRef = useRef(false);
  const didSelectWordRef = useRef(false);

  const selectedNeed = useMemo(
    () => circles.find((item) => item.key === selectedNeedKey) || null,
    [circles, selectedNeedKey],
  );

  useEffect(() => {
    if (!didSelectNeedRef.current) return;
    if (!selectedNeedKey || wordSectionY === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(wordSectionY - 16, 0), animated: true });
  }, [selectedNeedKey, wordSectionY]);

  useEffect(() => {
    if (!didSelectWordRef.current) return;
    if (!selectedWord || contextSectionY === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(contextSectionY - 16, 0), animated: true });
  }, [contextSectionY, selectedWord]);

  const onSelectNeedGroup = (key: NeedKey) => {
    didSelectNeedRef.current = true;
    setSelectedNeedKey(key);
    setSelectedWord(null);
    setSelectedWithOption(null);
    setSelectedWhereOption(null);
  };

  const handleComplete = async () => {
    if (!selectedNeed || !selectedWord) return;
    try {
      await updateTransaction({
        clientTxnId: transaction.clientTxnId,
        needSelection: {
          key: selectedNeed.key,
          label: selectedNeed.label,
          word: selectedWord,
          color: selectedNeed.layers[2],
          contextWith: selectedWithOption ?? undefined,
          contextWhere: selectedWhereOption ?? undefined,
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
          <Text style={styles.title}>Tap the color that best describes the need this transaction was trying to fulfill</Text>

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
            <View style={styles.section} onLayout={(event) => setWordSectionY(event.nativeEvent.layout.y)}>
              <Text style={styles.sectionTitle}>Pick the closest word</Text>
              <View style={styles.wordsGrid}>
                {selectedNeed.words.map((word) => {
                  const active = selectedWord === word;
                  return (
                    <Pressable
                      key={word}
                      onPress={() => {
                        didSelectWordRef.current = true;
                        setSelectedWord(word);
                      }}
                      style={[
                        styles.wordChip,
                        { borderColor: `${selectedNeed.layers[2]}99` },
                        active ? styles.wordChipActive : null,
                      ]}
                    >
                      <Text style={styles.wordText}>{word}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {selectedNeed && selectedWord ? (
            <View style={styles.section} onLayout={(event) => setContextSectionY(event.nativeEvent.layout.y)}>
              <Text style={styles.contextTitle}>Who are you with?</Text>
              <View style={styles.contextGrid}>
                {selectedNeed.withOptions.map((option) => {
                  const active = selectedWithOption === option;
                  return (
                    <Pressable
                      key={`with-${option}`}
                      onPress={() => setSelectedWithOption(option)}
                      style={[styles.contextChip, active ? styles.contextChipActive : null]}
                    >
                      <Text style={styles.contextChipText}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.contextTitle, { marginTop: 26 }]}>Where are you?</Text>
              <View style={styles.contextGrid}>
                {selectedNeed.whereOptions.map((option) => {
                  const active = selectedWhereOption === option;
                  return (
                    <Pressable
                      key={`where-${option}`}
                      onPress={() => setSelectedWhereOption(option)}
                      style={[styles.contextChip, active ? styles.contextChipActive : null]}
                    >
                      <Text style={styles.contextChipText}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleComplete}
                disabled={isSaving}
                style={[
                  styles.completeButton,
                  { backgroundColor: selectedNeed.layers[2], opacity: isSaving ? 0.72 : 1 },
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
          <Text style={styles.circleText}>{lineB}</Text>
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
  wordsGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  wordChip: {
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: "rgba(24,24,27,0.8)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wordChipActive: {
    backgroundColor: "rgba(63,63,70,0.92)",
  },
  wordText: {
    color: "#E4E4E7",
    fontSize: 14,
    lineHeight: 20,
  },
  contextTitle: {
    color: "#F4F4F5",
    fontSize: 20,
    lineHeight: 26,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  contextGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contextChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(24,24,27,0.64)",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contextChipActive: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(63,63,70,0.92)",
  },
  contextChipText: {
    color: "#F4F4F5",
    fontSize: 14,
    lineHeight: 20,
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
});
