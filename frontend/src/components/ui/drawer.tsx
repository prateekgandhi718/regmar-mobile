import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

type DrawerContentProps = {
  children: ReactNode;
};

type DrawerTextProps = {
  children: ReactNode;
};

export function Drawer({ open, onOpenChange, children }: DrawerProps) {
  return (
    <Modal
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onOpenChange(false)}>
          <View style={styles.backdrop} />
        </Pressable>
        {children}
      </View>
    </Modal>
  );
}

export function DrawerContent({ children }: DrawerContentProps) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.content}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      {children}
    </SafeAreaView>
  );
}

export function DrawerHeader({ children }: DrawerContentProps) {
  return <View style={styles.header}>{children}</View>;
}

export function DrawerTitle({ children }: DrawerTextProps) {
  return <Text style={styles.title}>{children}</Text>;
}

export function DrawerDescription({ children }: DrawerTextProps) {
  return <Text style={styles.description}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(26,26,26,0.28)" },
  content: { maxHeight: "90%", borderTopWidth: 3, borderTopColor: PAPER.decorative, backgroundColor: PAPER.page, paddingHorizontal: 24, paddingBottom: 20, paddingTop: 10 },
  handleWrap: { alignItems: "center", marginBottom: 12 },
  handle: { width: 44, height: 3, backgroundColor: PAPER.hairline },
  header: { marginBottom: 16 },
  title: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 24, lineHeight: 28 },
  description: { marginTop: 4, color: PAPER.secondary, fontFamily: PAPER_FONTS.bodyItalic, fontSize: 15, lineHeight: 21 },
});
