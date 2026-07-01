import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { EmailLinkGate } from "@/components/email/EmailLinkGate";
import { ModeToggle } from "@/components/mode-toggle";
import { isValidHexColor, normalizeHexColor, ThemePalette, withOpacity } from "@/theme/color-theme";

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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 180 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100" style={{ color: colors.primary }}>
            Settings
          </Text>
          <ModeToggle />
        </View>

        <EmailLinkGate
          title="Link the email"
          description="Connect your inbox here to enable transaction, accounts, and investment sync across the app."
          showLinkedStateWhenLinked
        >
          <Text className="mt-6 text-base text-zinc-600 dark:text-zinc-300">
            App preferences and account settings will appear here.
          </Text>
        </EmailLinkGate>

        <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
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
    </SafeAreaView>
  );
}
