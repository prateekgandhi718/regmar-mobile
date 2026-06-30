import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/components/providers/theme-provider";
import { useAppSelector } from "@/redux/hooks";
import { LandingScreen } from "@/screens/auth/LandingScreen";
import { OnboardingScreen } from "@/screens/auth/OnboardingScreen";
import { HomeScreen } from "@/screens/main/HomeScreen";

export type RootStackParamList = {
  Landing: undefined;
  Onboarding: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isDark } = useTheme();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Stack.Navigator initialRouteName={isAuthenticated ? "Home" : "Landing"}>
        {isAuthenticated ? (
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerShown: false,
            }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Landing"
              component={LandingScreen}
              options={{
                headerShown: false,
              }}
            />
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
