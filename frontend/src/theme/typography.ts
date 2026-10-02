import { Text, TextInput } from "react-native";

/**
 * NewspaperUI's web fonts are loaded under explicit family names by Expo.
 * Keeping the weight in the family name avoids the platform-specific weight
 * synthesis differences between iOS and Android.
 */
export const NEWSPAPER_FONTS = {
  masthead: "CormorantGaramond_600SemiBold",
  mastheadBold: "CormorantGaramond_700Bold",
  display: "SourceSerif4_600SemiBold",
  displayBold: "SourceSerif4_700Bold",
  body: "SourceSerif4_400Regular",
  bodyMedium: "SourceSerif4_500Medium",
  bodyItalic: "SourceSerif4_400Regular_Italic",
  meta: "Inter_400Regular",
  metaMedium: "Inter_500Medium",
  metaBold: "Inter_700Bold",
} as const;

export const DISPLAY_FONT_FAMILY = NEWSPAPER_FONTS.display;

let hasConfiguredTypography = false;

export const configureGlobalTypography = () => {
  if (hasConfiguredTypography) return;
  hasConfiguredTypography = true;

  const TextAny = Text as unknown as { defaultProps?: { style?: unknown } };
  TextAny.defaultProps = TextAny.defaultProps ?? {};
  TextAny.defaultProps.style = [{ fontFamily: NEWSPAPER_FONTS.body }, TextAny.defaultProps.style];

  const TextInputAny = TextInput as unknown as { defaultProps?: { style?: unknown } };
  TextInputAny.defaultProps = TextInputAny.defaultProps ?? {};
  TextInputAny.defaultProps.style = [{ fontFamily: NEWSPAPER_FONTS.body }, TextInputAny.defaultProps.style];
};
