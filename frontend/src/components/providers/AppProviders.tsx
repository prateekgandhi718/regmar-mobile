import { ReactNode } from "react";
import { Platform, StatusBar, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import type { ToastConfig } from "react-native-toast-message";
import { ReduxProvider } from "@/redux/provider";
import { withOpacity } from "@/theme/color-theme";
import { ColorThemeProvider, useColorTheme } from "./color-theme-provider";
import { ThemeProvider } from "./theme-provider";

type AppProvidersProps = {
  children: ReactNode;
};

const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 44;

function ThemedToastProvider() {
  const { colors } = useColorTheme();

  const toastConfig: ToastConfig = {
    success: ({ text1, text2 }) => (
      <View
        style={{ width: "100%", backgroundColor: colors.tertiary, paddingTop: topInset + 10, paddingBottom: 12, paddingHorizontal: 16 }}
      >
        {!!text1 && <Text style={{ color: colors.onTopOfTertiary, textAlign: "center", fontSize: 17, fontWeight: "700" }}>{text1}</Text>}
        {!!text2 && (
          <Text style={{ color: withOpacity(colors.onTopOfTertiary, 0.88), textAlign: "center", fontSize: 15, marginTop: 4 }}>{text2}</Text>
        )}
      </View>
    ),
    error: ({ text1, text2 }) => (
      <View
        style={{ width: "100%", backgroundColor: colors.secondary, paddingTop: topInset + 10, paddingBottom: 12, paddingHorizontal: 16 }}
      >
        {!!text1 && <Text style={{ color: colors.onTopOfSecondary, textAlign: "center", fontSize: 17, fontWeight: "700" }}>{text1}</Text>}
        {!!text2 && (
          <Text style={{ color: withOpacity(colors.onTopOfSecondary, 0.88), textAlign: "center", fontSize: 15, marginTop: 4 }}>{text2}</Text>
        )}
      </View>
    ),
  };

  return <Toast config={toastConfig} topOffset={0} visibilityTime={2600} autoHide swipeable={false} />;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ColorThemeProvider>
        <ReduxProvider>
          {children}
          <ThemedToastProvider />
        </ReduxProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  );
}
