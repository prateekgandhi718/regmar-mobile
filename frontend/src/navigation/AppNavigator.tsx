import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/components/providers/theme-provider";
import { AccountsScreen } from "@/screens/main/AccountsScreen";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { TransactionsScreen } from "@/screens/main/TransactionsScreen";

export type RootStackParamList = {
  Home: undefined;
  Accounts: undefined;
  Transactions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isDark } = useTheme();

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="Accounts" component={AccountsScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
