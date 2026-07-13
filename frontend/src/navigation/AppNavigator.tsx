import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabsNavigator } from "@/navigation/MainTabsNavigator";
import type { Transaction } from "@/lib/transactions-types";
import { useAppSelector } from "@/redux/hooks";
import { LandingScreen } from "@/screens/auth/LandingScreen";
import { OnboardingScreen } from "@/screens/auth/OnboardingScreen";
import { MutualFundsScreen } from "@/screens/main/MutualFundsScreen";
import { NeedsLoggedScreen } from "@/screens/main/NeedsLoggedScreen";
import { EmailCredentialsScreen } from "@/screens/main/EmailCredentialsScreen";
import { AccountSetupScreen } from "@/screens/main/AccountSetupScreen";
import { SettingsScreen } from "@/screens/main/SettingsScreen";
import { StocksScreen } from "@/screens/main/StocksScreen";
import { TotalTransactionsScreen } from "@/screens/main/TotalTransactionsScreen";
import { TransactionNeedCheckInScreen } from "@/screens/main/TransactionNeedCheckInScreen";

export type RootStackParamList = {
  Landing: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  NeedsLogged: {
    uniqueNeeds: number;
  };
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
  TransactionNeedCheckIn: {
    transaction: Pick<Transaction, "clientTxnId"> & {
      merchant: string;
      amount: number;
      type: "credit" | "debit";
      date: string;
      needSelection?: Transaction["needSelection"];
      categoryName?: string;
      accountTitle?: string;
    };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const hasCompletedOnboarding = useAppSelector((state) => state.auth.hasCompletedOnboarding);
  const shouldShowMain = isAuthenticated && hasCompletedOnboarding;
  const navigatorKey = shouldShowMain ? "main" : isAuthenticated ? "auth_onboarding" : "guest";

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        key={navigatorKey}
        initialRouteName={shouldShowMain ? "MainTabs" : isAuthenticated ? "Onboarding" : "Landing"}
        screenOptions={{
          animation: "slide_from_right",
        }}
      >
        {shouldShowMain ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabsNavigator}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="NeedsLogged"
              component={NeedsLoggedScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
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
            <Stack.Screen
              name="TransactionNeedCheckIn"
              component={TransactionNeedCheckInScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            {!isAuthenticated ? (
              <Stack.Screen
                name="Landing"
                component={LandingScreen}
                options={{
                  headerShown: false,
                }}
              />
            ) : null}
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
