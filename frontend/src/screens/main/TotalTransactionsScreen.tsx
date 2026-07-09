import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryIcon } from "@/components/category-icon";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetCategoriesQuery } from "@/redux/api/categoriesApi";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type TotalTransactionsRouteProp = RouteProp<RootStackParamList, "TotalTransactions">;
type TotalTransactionsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FALLBACK_CATEGORIES = [
  "Food & Grocery",
  "Transport & Fuel",
  "Shopping",
  "Medical",
  "Entertainment",
  "Investment",
  "Housing",
  "Personal",
];

const formatCompactTxnCount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    const formatted = (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}B`;
  }
  if (absolute >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (absolute >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}k`;
  }
  return `${Math.round(value)}`;
};

function CategoryTiles() {
  const { width } = useWindowDimensions();
  const { data: categories = [] } = useGetCategoriesQuery();
  const horizontalPadding = 48;
  const columns = 6;
  const gap = 7;
  const tileCount = 36;
  const mosaicWidth = Math.max(240, width - horizontalPadding);
  const tileSize = Math.floor((mosaicWidth - gap * (columns - 1)) / columns);
  const categoryNames = (categories.length ? categories.map((item) => item.name) : FALLBACK_CATEGORIES).filter(Boolean);

  const tiles = Array.from({ length: tileCount }, (_, index) => ({
    key: `category-tile-${index}`,
    categoryName: categoryNames[index % categoryNames.length] || "category",
  }));

  return (
    <View style={[styles.mosaicWrap, { width: mosaicWidth }]}>
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, { width: tileSize, height: tileSize }]}>
          <CategoryIcon name={tile.categoryName} size={Math.max(20, Math.round(tileSize * 0.5))} color="#E4E4E7" />
        </View>
      ))}
    </View>
  );
}

export function TotalTransactionsScreen() {
  const navigation = useNavigation<TotalTransactionsNavigationProp>();
  const route = useRoute<TotalTransactionsRouteProp>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const totalTransactions = route.params?.totalTransactions ?? 0;
  const metricLabelSize = Math.max(42, Math.min(64, Math.round(width * 0.14)));
  const metricValueSize = Math.max(102, Math.min(168, Math.round(width * 0.35)));
  const copySize = Math.max(18, Math.min(24, Math.round(width * 0.055)));

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close total transactions details"
        >
          <Feather name="x" size={24} color="#E4E4E7" />
        </Pressable>

        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { fontSize: metricLabelSize, lineHeight: metricLabelSize + 2 }]}>Total txns</Text>
          <Text style={[styles.metricValue, { fontSize: metricValueSize, lineHeight: metricValueSize - 10 }]}>
            {formatCompactTxnCount(totalTransactions)}
          </Text>
        </View>

        <Text style={[styles.copy, { fontSize: copySize, lineHeight: copySize + 10 }]}>
          Every transaction is a small vote for the life you are building. Tracking them turns noise into meaning and helps
          you spend with intention, not impulse.
        </Text>

        <CategoryTiles />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  container: {
    flex: 1,
    backgroundColor: "#09090B",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.2)",
    backgroundColor: "rgba(24,24,27,0.84)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 54,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 38,
  },
  metricLabel: {
    color: "#FAFAFA",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
    fontSize: 64,
    lineHeight: 66,
    maxWidth: "50%",
  },
  metricValue: {
    color: "#FAFAFA",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
    fontSize: 168,
    lineHeight: 154,
    letterSpacing: -2,
  },
  copy: {
    color: "#E5E7EB",
    fontWeight: "500",
    marginBottom: 22,
    maxWidth: "96%",
  },
  mosaicWrap: {
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 7,
    columnGap: 7,
  },
  tile: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
