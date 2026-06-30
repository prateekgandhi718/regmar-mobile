import { Pressable, Text, View } from "react-native";

export function MarketingFooter() {
  return (
    <View className="w-full border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <View className="flex-row items-center justify-center gap-5">
        <Pressable>
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">Privacy Policy</Text>
        </Pressable>
        <Pressable>
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">Terms & Conditions</Text>
        </Pressable>
      </View>
    </View>
  );
}
