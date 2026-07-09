import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabsNavigator } from "@/navigation/MainTabsNavigator";
import type { Transaction } from "@/lib/transactions-types";
import { useAppSelector } from "@/redux/hooks";
import { LandingScreen } from "@/screens/auth/LandingScreen";
import { OnboardingScreen } from "@/screens/auth/OnboardingScreen";
import { MutualFundsScreen } from "@/screens/main/MutualFundsScreen";
import { SettingsScreen } from "@/screens/main/SettingsScreen";
import { StocksScreen } from "@/screens/main/StocksScreen";
import { TransactionNeedCheckInScreen } from "@/screens/main/TransactionNeedCheckInScreen";

export type RootStackParamList = {
  Landing: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Settings: undefined;
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
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: false,
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
