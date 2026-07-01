import { ReactNode } from "react";
import { Platform, StatusBar, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import type { ToastConfig } from "react-native-toast-message";
import { ReduxProvider } from "@/redux/provider";
import { ThemeProvider } from "./theme-provider";

type AppProvidersProps = {
  children: ReactNode;
};

const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 44;

const toastConfig: ToastConfig = {
  success: ({ text1, text2 }) => (
    <View style={{ width: "100%", backgroundColor: "#41b12e", paddingTop: topInset + 10, paddingBottom: 12, paddingHorizontal: 16 }}>
      {!!text1 && <Text style={{ color: "#ffffff", textAlign: "center", fontSize: 17, fontWeight: "700" }}>{text1}</Text>}
      {!!text2 && <Text style={{ color: "#ecfdf5", textAlign: "center", fontSize: 15, marginTop: 4 }}>{text2}</Text>}
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={{ width: "100%", backgroundColor: "#db4437", paddingTop: topInset + 10, paddingBottom: 12, paddingHorizontal: 16 }}>
      {!!text1 && <Text style={{ color: "#ffffff", textAlign: "center", fontSize: 17, fontWeight: "700" }}>{text1}</Text>}
      {!!text2 && <Text style={{ color: "#fef2f2", textAlign: "center", fontSize: 15, marginTop: 4 }}>{text2}</Text>}
    </View>
  ),
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ReduxProvider>
        {children}
        <Toast config={toastConfig} topOffset={0} visibilityTime={2600} autoHide swipeable={false} />
      </ReduxProvider>
    </ThemeProvider>
  );
}
