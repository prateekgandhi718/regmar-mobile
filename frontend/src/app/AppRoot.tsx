import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppNavigator } from "@/navigation/AppNavigator";

export function AppRoot() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <AppNavigator />
    </AppProviders>
  );
}
