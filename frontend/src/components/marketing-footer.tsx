import { Pressable, StyleSheet, Text, View } from "react-native";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

export function MarketingFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.row}>
        <Pressable>
          <Text style={styles.text}>Privacy Policy</Text>
        </Pressable>
        <Pressable>
          <Text style={styles.text}>Terms & Conditions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { width: "100%", borderTopWidth: 1, borderTopColor: PAPER.hairline, paddingHorizontal: 24, paddingVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  text: { color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 12 },
});
