import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LiquidGlassTabBar } from "@/components/navigation/LiquidGlassTabBar";
import { AccountsScreen } from "@/screens/main/AccountsScreen";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { InvestmentsScreen } from "@/screens/main/InvestmentsScreen";
import { TransactionsScreen } from "@/screens/main/TransactionsScreen";

export type MainTabParamList = {
  Home: undefined;
  Txns: undefined;
  Investments: undefined;
  Accounts: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Txns" component={TransactionsScreen} />
      <Tab.Screen name="Investments" component={InvestmentsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
    </Tab.Navigator>
  );
}
