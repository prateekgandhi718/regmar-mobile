import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = ["light", "dark", "system"] as const;

export function ModeToggle() {
  const { theme, setTheme, isDark } = useTheme();
  const { colors } = useColorTheme();
  const [open, setOpen] = useState(false);

  return (
    <View className="relative z-30">
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        className="h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        hitSlop={8}
      >
        <Feather name={isDark ? "moon" : "sun"} size={18} color={colors.primary} />
      </Pressable>

      {open ? (
        <View className="absolute right-0 top-12 min-w-[130px] rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {OPTIONS.map((option) => {
            const active = theme === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setTheme(option);
                  setOpen(false);
                }}
                className={cn("rounded-lg px-3 py-2", active && "bg-zinc-100 dark:bg-zinc-800")}
              >
                <Text className="text-sm capitalize text-zinc-800 dark:text-zinc-200">{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
