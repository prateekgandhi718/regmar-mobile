import { Feather } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { FiyLogo } from "@/components/fiy-logo";

type SetupProgressHeaderProps = {
  current: number;
  total: number;
  onBack?: () => void;
};

export function SetupProgressHeader({ current, total, onBack }: SetupProgressHeaderProps) {
  const progress = Math.max(0, Math.min(1, current / total));

  return (
    <View className="flex-row items-center gap-3">
      {onBack ? (
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full border border-zinc-700"
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color="#F4F4F5" />
        </Pressable>
      ) : (
        <View className="h-10 w-10 items-center justify-center">
          <FiyLogo size={24} />
        </View>
      )}
      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <View className="h-full rounded-full bg-zinc-100" style={{ width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}
