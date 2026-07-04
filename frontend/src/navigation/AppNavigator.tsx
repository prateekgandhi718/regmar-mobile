import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/components/providers/theme-provider";
import { MainTabsNavigator } from "@/navigation/MainTabsNavigator";
import { useAppSelector } from "@/redux/hooks";
import { LandingScreen } from "@/screens/auth/LandingScreen";
import { OnboardingScreen } from "@/screens/auth/OnboardingScreen";
import { SettingsScreen } from "@/screens/main/SettingsScreen";

export type RootStackParamList = {
  Landing: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isDark } = useTheme();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const hasCompletedOnboarding = useAppSelector((state) => state.auth.hasCompletedOnboarding);
  const shouldShowMain = isAuthenticated && hasCompletedOnboarding;
  const navigatorKey = shouldShowMain ? "main" : isAuthenticated ? "auth_onboarding" : "guest";

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
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
