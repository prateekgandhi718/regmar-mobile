import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { ModeToggle } from "@/components/mode-toggle";
import { isValidHexColor, normalizeHexColor, ThemePalette, withOpacity } from "@/theme/color-theme";

const RANDOM_THEME_PALETTES_LIGHT: ThemePalette[] = [
  { primary: "#2563EB", secondary: "#F59E0B", tertiary: "#10B981" },
  { primary: "#4F46E5", secondary: "#14B8A6", tertiary: "#F97316" },
  { primary: "#BE123C", secondary: "#0EA5E9", tertiary: "#22C55E" },
  { primary: "#7C3AED", secondary: "#06B6D4", tertiary: "#F43F5E" },
  { primary: "#1D4ED8", secondary: "#16A34A", tertiary: "#FB923C" },
  { primary: "#0F766E", secondary: "#2563EB", tertiary: "#E11D48" },
  { primary: "#4338CA", secondary: "#059669", tertiary: "#EA580C" },
  { primary: "#0EA5E9", secondary: "#7C3AED", tertiary: "#F59E0B" },
];

const RANDOM_THEME_PALETTES_DARK: ThemePalette[] = [
  { primary: "#60A5FA", secondary: "#FBBF24", tertiary: "#34D399" },
  { primary: "#A78BFA", secondary: "#22D3EE", tertiary: "#FB7185" },
  { primary: "#38BDF8", secondary: "#C084FC", tertiary: "#FACC15" },
  { primary: "#2DD4BF", secondary: "#818CF8", tertiary: "#FB7185" },
  { primary: "#93C5FD", secondary: "#F472B6", tertiary: "#4ADE80" },
  { primary: "#67E8F9", secondary: "#A3E635", tertiary: "#FCA5A5" },
  { primary: "#C4B5FD", secondary: "#FDE047", tertiary: "#5EEAD4" },
  { primary: "#7DD3FC", secondary: "#F9A8D4", tertiary: "#86EFAC" },
];

const parsePaletteInput = (value: string): ThemePalette | null => {
  const parts = value
    .split(",")
    .map((part) => normalizeHexColor(part))
    .filter(Boolean);

  if (parts.length !== 3) return null;
  const [primary, secondary, tertiary] = parts;
  if (!isValidHexColor(primary) || !isValidHexColor(secondary) || !isValidHexColor(tertiary)) {
    return null;
  }

  return { primary, secondary, tertiary };
};

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const { palette, colors, setPalette, resetPalette, isPaletteReady } = useColorTheme();
  const [paletteInput, setPaletteInput] = useState(`${palette.primary},${palette.secondary},${palette.tertiary}`);
  const [isSavingPalette, setIsSavingPalette] = useState(false);

  useEffect(() => {
    setPaletteInput(`${palette.primary},${palette.secondary},${palette.tertiary}`);
  }, [palette.primary, palette.secondary, palette.tertiary]);

  const parsedPalette = useMemo(() => parsePaletteInput(paletteInput), [paletteInput]);
  const isValid = !!parsedPalette;
  const isDirty =
    !!parsedPalette &&
    (parsedPalette.primary !== palette.primary ||
      parsedPalette.secondary !== palette.secondary ||
      parsedPalette.tertiary !== palette.tertiary);

  const applyDisabled = !isPaletteReady || !isValid || !isDirty || isSavingPalette;

  const handleApplyPalette = async () => {
    if (!parsedPalette || isSavingPalette) return;

    try {
      setIsSavingPalette(true);
      await setPalette(parsedPalette);
      Toast.show({
        type: "success",
        text1: "Theme updated",
      });
    } catch (error) {
      console.error("Failed to save palette", error);
      Toast.show({
        type: "error",
        text1: "Could not apply colors",
      });
    } finally {
      setIsSavingPalette(false);
    }
  };

  const handleResetPalette = async () => {
    if (isSavingPalette) return;

    try {
      setIsSavingPalette(true);
      await resetPalette();
      Toast.show({
        type: "success",
        text1: "Theme reset",
      });
    } catch (error) {
      console.error("Failed to reset palette", error);
      Toast.show({
        type: "error",
        text1: "Could not reset colors",
      });
    } finally {
      setIsSavingPalette(false);
    }
  };

  const handleRandomizePalette = async () => {
    if (isSavingPalette) return;

    const palettes = isDark ? RANDOM_THEME_PALETTES_DARK : RANDOM_THEME_PALETTES_LIGHT;
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    const nextInput = `${randomPalette.primary},${randomPalette.secondary},${randomPalette.tertiary}`;

    try {
      setIsSavingPalette(true);
      setPaletteInput(nextInput);
      await setPalette(randomPalette);
    } catch (error) {
      console.error("Failed to randomize palette", error);
    } finally {
      setIsSavingPalette(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View className="w-full flex-row items-center justify-between px-6 pt-3">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => navigation.goBack()}
              className="h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              hitSlop={8}
            >
              <Feather name="chevron-left" size={20} color={colors.primary} />
            </Pressable>
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
              SETTINGS
            </Text>
          </View>
          <ModeToggle />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
        >
          <EmailLinkGate
            title="Link the email"
            description="Connect your inbox here to enable transaction, accounts, and investment sync across the app."
            showLinkedStateWhenLinked
          >
            <></>
          </EmailLinkGate>

          <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <View className="mb-3 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Feather name="droplet" size={16} color={colors.primary} />
                  <Text className="text-base font-bold text-zinc-900 dark:text-zinc-100">Accent Colors</Text>
                </View>
                <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Enter 3 colors for your theme.</Text>
              </View>
              <View className="flex-row gap-1">
                <View className="h-4 w-4 rounded-full border border-white" style={{ backgroundColor: colors.primary }} />
                <View className="h-4 w-4 rounded-full border border-white" style={{ backgroundColor: colors.secondary }} />
                <View className="h-4 w-4 rounded-full border border-white" style={{ backgroundColor: colors.tertiary }} />
              </View>
            </View>

            <TextInput
              value={paletteInput}
              onChangeText={setPaletteInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="#2563EB,#F97316,#22C55E"
              placeholderTextColor="#71717A"
              className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />

            {!isValid ? (
              <Text className="mt-2 text-xs text-red-500">Enter 3 comma-separated hex values.</Text>
            ) : null}

            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={handleRandomizePalette}
                disabled={isSavingPalette}
                className="items-center justify-center rounded-xl border px-3 py-3"
                style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.1) }}
              >
                <Feather name="shuffle" size={14} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={handleApplyPalette}
                disabled={applyDisabled}
                className="flex-1 items-center justify-center rounded-xl px-4 py-3"
                style={{ backgroundColor: applyDisabled ? "rgba(113,113,122,0.35)" : colors.primary }}
              >
                <Text className="text-sm font-semibold" style={{ color: applyDisabled ? "#E4E4E7" : colors.onTopOfPrimary }}>
                  {isSavingPalette ? "Applying..." : "Apply"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleResetPalette}
                disabled={isSavingPalette || !isPaletteReady}
                className="items-center justify-center rounded-xl border px-4 py-3"
                style={{ borderColor: withOpacity(colors.secondary, 0.45), backgroundColor: withOpacity(colors.secondary, 0.12) }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.secondary }}>
                  Reset
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
