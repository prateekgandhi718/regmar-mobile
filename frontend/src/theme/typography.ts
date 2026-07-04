import { Platform, Text, TextInput } from "react-native";

export const DISPLAY_FONT_FAMILY = Platform.select({
  ios: "Times New Roman",
  android: "serif",
  default: "serif",
});

let hasConfiguredTypography = false;

export const configureGlobalTypography = () => {
  if (hasConfiguredTypography) return;
  hasConfiguredTypography = true;

  const TextAny = Text as unknown as { defaultProps?: { style?: unknown } };
  TextAny.defaultProps = TextAny.defaultProps ?? {};
  TextAny.defaultProps.style = [{ fontFamily: DISPLAY_FONT_FAMILY }, TextAny.defaultProps.style];

  const TextInputAny = TextInput as unknown as { defaultProps?: { style?: unknown } };
  TextInputAny.defaultProps = TextInputAny.defaultProps ?? {};
  TextInputAny.defaultProps.style = [{ fontFamily: DISPLAY_FONT_FAMILY }, TextInputAny.defaultProps.style];
};
