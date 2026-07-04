import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NeedSelection } from "@/lib/transactions-types";

type NeedCheckInOrbProps = {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  needSelection?: NeedSelection;
};

export function NeedCheckInOrb({ onPress, onPressIn, onPressOut, needSelection }: NeedCheckInOrbProps) {
  const isCompleted = Boolean(needSelection?.key);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.root, isCompleted ? styles.completedRoot : null]}
      hitSlop={10}
    >
      {isCompleted && needSelection ? (
        <NeedShape needKey={needSelection.key} color={needSelection.color} />
      ) : (
        <Feather name="plus" size={16} color="#F4F4F5" />
      )}
    </Pressable>
  );
}

function NeedShape({
  needKey,
  color,
}: {
  needKey: NeedSelection["key"];
  color?: string;
}) {
  const tint = color || "#F4F4F5";

  if (needKey === "protection") {
    return <View pointerEvents="none" style={[styles.shapeProtection, { backgroundColor: tint }]} />;
  }

  if (needKey === "fuel") {
    return <View pointerEvents="none" style={[styles.shapeFuel, { backgroundColor: tint }]} />;
  }

  if (needKey === "connection") {
    return (
      <View pointerEvents="none" style={styles.shapeConnectionWrap}>
        <View style={[styles.shapeConnectionCircle, { backgroundColor: tint }]} />
        <View style={[styles.shapeConnectionCut, { backgroundColor: "rgba(9,9,11,0.62)" }]} />
      </View>
    );
  }

  return <View pointerEvents="none" style={[styles.shapeFreedom, { backgroundColor: tint }]} />;
}

const styles = StyleSheet.create({
  root: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(9,9,11,0.44)",
    alignItems: "center",
    justifyContent: "center",
  },
  completedRoot: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(9,9,11,0.62)",
  },
  shapeProtection: {
    width: 20,
    height: 20,
    transform: [{ rotate: "45deg" }],
    borderRadius: 3,
  },
  shapeFuel: {
    width: 21,
    height: 21,
    borderRadius: 8,
  },
  shapeConnectionWrap: {
    width: 21,
    height: 21,
    position: "relative",
  },
  shapeConnectionCircle: {
    width: 21,
    height: 21,
    borderRadius: 999,
  },
  shapeConnectionCut: {
    position: "absolute",
    right: 0,
    top: 8,
    width: 9,
    height: 7,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  shapeFreedom: {
    width: 22,
    height: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 6,
  },
});
