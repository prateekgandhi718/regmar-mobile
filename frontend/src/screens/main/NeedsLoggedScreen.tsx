import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type NeedsLoggedRouteProp = RouteProp<RootStackParamList, "NeedsLogged">;
type NeedsLoggedNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TILE_COLORS = ["#5FE4A4", "#FF6B43", "#7EA8FF", "#F4D54D"];
const TILE_SHAPES: Array<"rounded" | "pill" | "circle" | "cut" | "flat" | "squircle"> = [
  "rounded",
  "pill",
  "circle",
  "cut",
  "flat",
  "squircle",
];

function BottomMosaic() {
  const { width } = useWindowDimensions();
  const horizontalPadding = 48; // container padding (24 + 24)
  const columns = 6;
  const gap = 7;
  const mosaicWidth = Math.max(240, width - horizontalPadding);
  const tileSize = Math.floor((mosaicWidth - gap * (columns - 1)) / columns);
  const tiles = Array.from({ length: 36 }, (_, index) => {
    const color = TILE_COLORS[index % TILE_COLORS.length];
    const shape = TILE_SHAPES[(index * 5) % TILE_SHAPES.length];

    return { key: `tile-${index}`, color, shape };
  });

  return (
    <View style={[styles.mosaicWrap, { width: mosaicWidth }]}>
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, { width: tileSize, height: tileSize, backgroundColor: tile.color }, shapeStyles[tile.shape]]} />
      ))}
    </View>
  );
}

export function NeedsLoggedScreen() {
  const navigation = useNavigation<NeedsLoggedNavigationProp>();
  const route = useRoute<NeedsLoggedRouteProp>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const uniqueNeeds = route.params?.uniqueNeeds ?? 0;
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
          accessibilityLabel="Close unique needs details"
        >
          <Feather name="x" size={24} color="#E4E4E7" />
        </Pressable>

        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { fontSize: metricLabelSize, lineHeight: metricLabelSize + 2 }]}>Unique needs</Text>
          <Text style={[styles.metricValue, { fontSize: metricValueSize, lineHeight: metricValueSize - 10 }]}>
            {uniqueNeeds}
          </Text>
        </View>

        <Text style={[styles.copy, { fontSize: copySize, lineHeight: copySize + 10 }]}>
          The more kinds of needs you can identify, the clearer your spending patterns become and the easier it is to make
          choices aligned with what matters to you.
        </Text>

        <BottomMosaic />
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
  tile: {},
});

const shapeStyles = StyleSheet.create({
  rounded: {
    borderRadius: 22,
  },
  pill: {
    borderRadius: 999,
  },
  circle: {
    borderRadius: 999,
    transform: [{ scaleX: 0.92 }],
  },
  cut: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 24,
  },
  flat: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  squircle: {
    borderRadius: 14,
  },
});
