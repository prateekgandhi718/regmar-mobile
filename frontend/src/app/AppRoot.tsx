import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/components/providers/AppProviders";
import { useTheme } from "@/components/providers/theme-provider";
import { AppNavigator } from "@/navigation/AppNavigator";

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export function AppRoot() {
  return (
    <AppProviders>
      <AppStatusBar />
      <AppNavigator />
    </AppProviders>
  );
}
