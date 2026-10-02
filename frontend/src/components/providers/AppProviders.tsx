import { ReactNode } from "react";
import { Platform, StatusBar, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import type { ToastConfig } from "react-native-toast-message";
import { ReduxProvider } from "@/redux/provider";
import { ColorThemeProvider } from "./color-theme-provider";
import { ThemeProvider } from "./theme-provider";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type AppProvidersProps = {
  children: ReactNode;
};

const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 44;

function ThemedToastProvider() {
  const toastConfig: ToastConfig = {
    success: ({ text1, text2 }) => (
      <View style={{ width: "100%", backgroundColor: PAPER.ink, paddingTop: topInset + 10, paddingBottom: 12, paddingHorizontal: 16 }}>
        {!!text1 && <Text style={{ color: PAPER.page, textAlign: "center", fontFamily: PAPER_FONTS.metaBold, fontSize: 15 }}>{text1}</Text>}
        {!!text2 && <Text style={{ color: PAPER.highlight, textAlign: "center", fontFamily: PAPER_FONTS.meta, fontSize: 13, marginTop: 4 }}>{text2}</Text>}
      </View>
    ),
    error: ({ text1, text2 }) => (
      <View style={{ width: "100%", backgroundColor: PAPER.accent, paddingTop: topInset + 10, paddingBottom: 12, paddingHorizontal: 16 }}>
        {!!text1 && <Text style={{ color: PAPER.page, textAlign: "center", fontFamily: PAPER_FONTS.metaBold, fontSize: 15 }}>{text1}</Text>}
        {!!text2 && <Text style={{ color: PAPER.page, textAlign: "center", fontFamily: PAPER_FONTS.meta, fontSize: 13, marginTop: 4 }}>{text2}</Text>}
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
