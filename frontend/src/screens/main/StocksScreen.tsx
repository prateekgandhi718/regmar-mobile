import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function StocksScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <View className="flex-1 px-6 pt-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(24,24,27,0.9)", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1 }}
          >
            <Feather name="arrow-left" size={18} color="#E4E4E7" />
          </Pressable>
          <View>
            <Text
              style={{
                fontFamily: DISPLAY_FONT_FAMILY,
                fontSize: 32,
                lineHeight: 36,
                fontWeight: "700",
                color: "#F4F4F5",
              }}
            >
              Stocks
            </Text>
            <Text className="text-[11px] font-black uppercase tracking-[1.3px] text-zinc-500">Preview</Text>
          </View>
        </View>

        <View className="mt-8 overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-950">
          <View className="absolute -left-16 -top-12 h-52 w-52 rounded-full" style={{ backgroundColor: withOpacity("#69E3B0", 0.17) }} />
          <View className="absolute -right-10 top-20 h-48 w-48 rounded-full" style={{ backgroundColor: withOpacity("#7EA6FF", 0.2) }} />
          <LinearGradient colors={["rgba(24,24,27,0.95)", "rgba(9,9,11,1)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View className="px-6 py-8">
              <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: withOpacity("#69E3B0", 0.18) }}>
                <Feather name="bar-chart-2" size={24} color="#9DF2CF" />
              </View>

              <Text className="mt-5 text-[30px] font-black leading-[34px] text-zinc-100">Stocks are coming next</Text>
              <Text className="mt-3 text-[14px] leading-6 text-zinc-300">
                This page is in progress. Soon you will get holdings, allocation hints, and optimization insights here.
              </Text>

              <View className="mt-6 self-start rounded-full border border-zinc-700 bg-black/55 px-4 py-2">
                <Text className="text-[11px] font-black uppercase tracking-[1.2px] text-zinc-300">Placeholder screen</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
}
