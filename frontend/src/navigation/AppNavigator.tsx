import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppSelector } from "@/redux/hooks";
import { OnboardingScreen } from "@/screens/auth/OnboardingScreen";
import { AccountsScreen } from "@/screens/main/AccountsScreen";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { InvestmentsScreen } from "@/screens/main/InvestmentsScreen";
import { MutualFundsScreen } from "@/screens/main/MutualFundsScreen";
import { EmailCredentialsScreen } from "@/screens/main/EmailCredentialsScreen";
import { AccountSetupScreen } from "@/screens/main/AccountSetupScreen";
import { SettingsScreen } from "@/screens/main/SettingsScreen";
import { StocksScreen } from "@/screens/main/StocksScreen";
import { TotalTransactionsScreen } from "@/screens/main/TotalTransactionsScreen";
import { TransactionsScreen } from "@/screens/main/TransactionsScreen";
import { PAPER } from "@/theme/newspaper-theme";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Transactions: undefined;
  Investments: undefined;
  Accounts: undefined;
  TotalTransactions: {
    totalTransactions: number;
  };
  Settings: undefined;
  AccountSetup: undefined;
  EmailCredentials: {
    mode: "create" | "edit";
    provider: "gmail" | "icloud";
    email?: string;
  };
  MutualFunds: undefined;
  Stocks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const hasCompletedOnboarding = useAppSelector((state) => state.auth.hasCompletedOnboarding);
  const shouldShowMain = isAuthenticated && hasCompletedOnboarding;
  const navigatorKey = shouldShowMain ? "main" : "auth";

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: PAPER.accent,
          background: PAPER.page,
          card: PAPER.surface,
          text: PAPER.ink,
          border: PAPER.hairline,
          notification: PAPER.accent,
        },
      }}
    >
      <Stack.Navigator
        key={navigatorKey}
        initialRouteName={shouldShowMain ? "Home" : "Onboarding"}
        screenOptions={{
          animation: "slide_from_right",
        }}
      >
        {shouldShowMain ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Investments" component={InvestmentsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Accounts" component={AccountsScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="TotalTransactions"
              component={TotalTransactionsScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="AccountSetup"
              component={AccountSetupScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="EmailCredentials"
              component={EmailCredentialsScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="MutualFunds"
              component={MutualFundsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Stocks"
              component={StocksScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
