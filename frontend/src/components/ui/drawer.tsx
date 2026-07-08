import { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" onPress={() => onOpenChange(false)}>
          <View className="absolute inset-0 bg-black/15 dark:bg-black/25" />
        </Pressable>
        {children}
      </View>
    </Modal>
  );
}

export function DrawerContent({ children }: DrawerContentProps) {
  return (
    <SafeAreaView
      edges={["bottom"]}
      className="max-h-[88%] rounded-t-3xl border border-zinc-200 bg-zinc-50 px-5 pb-5 pt-3 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <View className="mb-3 items-center">
        <View className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      </View>
      {children}
    </SafeAreaView>
  );
}

export function DrawerHeader({ children }: DrawerContentProps) {
  return <View className="mb-4">{children}</View>;
}

export function DrawerTitle({ children }: DrawerTextProps) {
  return <Text className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{children}</Text>;
}

export function DrawerDescription({ children }: DrawerTextProps) {
  return <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{children}</Text>;
}
