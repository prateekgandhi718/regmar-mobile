import { ReactNode, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { MainTabParamList } from "@/navigation/MainTabsNavigator";
import { useAddAccountMutation, useGetAccountsQuery } from "@/redux/api/accountsApi";
import { withOpacity } from "@/theme/color-theme";

type AccountSetupGateProps = {
  title: string;
  description: string;
  children: ReactNode;
  showPromptOnly?: boolean;
  showAccountsList?: boolean;
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

const parseDomainNames = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const metallicCardPalettes = [
  { top: "#F8FAFC", mid: "#D1D5DB", bottom: "#9CA3AF", chip: "#D97706" },
  { top: "#EEF2FF", mid: "#C4B5FD", bottom: "#6D28D9", chip: "#F59E0B" },
  { top: "#ECFEFF", mid: "#67E8F9", bottom: "#0E7490", chip: "#FB923C" },
  { top: "#FFF7ED", mid: "#FDBA74", bottom: "#C2410C", chip: "#FACC15" },
];

export function AccountSetupGate({
  title,
  description,
  children,
  showPromptOnly = false,
  showAccountsList = false,
}: AccountSetupGateProps) {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { colors } = useColorTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [domainInput, setDomainInput] = useState("");
  const [formError, setFormError] = useState("");

  const { data: accounts = [], isLoading: isLoadingAccounts } = useGetAccountsQuery();
  const [addAccount, { isLoading: isSaving }] = useAddAccountMutation();

  const hasAccounts = accounts.length > 0;
  const shouldShowPrompt = !hasAccounts;

  const domainCount = useMemo(() => parseDomainNames(domainInput).length, [domainInput]);

  const resetForm = () => {
    setTitleInput("");
    setCurrency("INR");
    setDomainInput("");
    setFormError("");
  };

  const handleCreateAccount = async () => {
    const normalizedTitle = titleInput.trim();
    const domainNames = parseDomainNames(domainInput);
    if (!normalizedTitle) {
      setFormError("Account name is required.");
      return;
    }
    if (!domainNames.length) {
      setFormError("Add at least one sender domain/email.");
      return;
    }

    try {
      const response = await addAccount({
        title: normalizedTitle,
        currency,
        domainNames,
      }).unwrap();
      Toast.show({
        type: "success",
        text1: "Account added",
        text2: `${response.title} is ready for sync.`,
      });
      setDrawerOpen(false);
      resetForm();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      setFormError(apiError?.data?.message || "Could not create account.");
      Toast.show({
        type: "error",
        text1: "Failed to add account",
        text2: apiError?.data?.message || "Please try again.",
      });
    }
  };

  const cardPrompt = (
    <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withOpacity(colors.primary, 0.14) }}>
          <Feather name="credit-card" size={16} color={colors.primary} />
        </View>
        <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</Text>
      </View>
      <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{description}</Text>

      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={() => setDrawerOpen(true)}
          className="flex-row items-center gap-2 rounded-xl border px-4 py-2"
          style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
        >
          <Feather name="plus" size={14} color={colors.primary} />
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            Add account
          </Text>
        </Pressable>
        {showPromptOnly ? (
          <Pressable
            onPress={() => navigation.navigate("Accounts")}
            className="flex-row items-center gap-2 rounded-xl border px-4 py-2"
            style={{ borderColor: withOpacity(colors.secondary, 0.45), backgroundColor: withOpacity(colors.secondary, 0.08) }}
          >
            <Feather name="arrow-right-circle" size={14} color={colors.secondary} />
            <Text className="text-sm font-semibold" style={{ color: colors.secondary }}>
              Go to Accounts
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const metallicCards = showAccountsList && hasAccounts ? (
    <View className="mt-6 gap-3">
      {accounts.map((account, index) => {
        const palette = metallicCardPalettes[index % metallicCardPalettes.length];
        return (
          <View
            key={account._id}
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: withOpacity(colors.primary, 0.2), backgroundColor: palette.bottom }}
          >
            <View
              className="px-4 py-4"
              style={{
                backgroundColor: palette.mid,
              }}
            >
              <View
                className="absolute inset-0"
                style={{ backgroundColor: palette.top, opacity: 0.3 }}
              />
              <View className="mb-5 flex-row items-start justify-between">
                <Text className="text-base font-black tracking-wide text-zinc-900">{account.title.toUpperCase()}</Text>
                <View className="h-8 w-11 rounded-md" style={{ backgroundColor: palette.chip, opacity: 0.9 }} />
              </View>
              <Text className="text-xs font-semibold tracking-[2px] text-zinc-800">
                {account.currency}
              </Text>
              <Text className="mt-1 text-xs text-zinc-800">
                {account.domainIds.length} sender domain{account.domainIds.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  ) : null;

  return (
    <>
      {isLoadingAccounts ? (
        <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <Text className="text-sm text-zinc-600 dark:text-zinc-300">Loading accounts...</Text>
          </View>
        </View>
      ) : shouldShowPrompt ? (
        cardPrompt
      ) : null}

      {metallicCards}
      {children}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            <DrawerHeader>
              <DrawerTitle>Add Account</DrawerTitle>
              <DrawerDescription>
                Create a sync-ready account with currency and sender domains.
              </DrawerDescription>
            </DrawerHeader>

            <View className="mb-4 gap-3">
              <View>
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Account Name</Text>
                <TextInput
                  value={titleInput}
                  onChangeText={(value) => {
                    setTitleInput(value);
                    setFormError("");
                  }}
                  autoCapitalize="words"
                  placeholder="HDFC Salary Account"
                  placeholderTextColor="#71717A"
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Currency</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CURRENCIES.map((curr) => {
                    const active = curr === currency;
                    return (
                      <Pressable
                        key={curr}
                        onPress={() => setCurrency(curr)}
                        className="rounded-xl border px-3 py-2"
                        style={
                          active
                            ? { borderColor: colors.primary, backgroundColor: colors.primary }
                            : { borderColor: withOpacity(colors.primary, 0.35) }
                        }
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: active ? colors.onTopOfPrimary : colors.primary }}
                        >
                          {curr}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Sender Domains / Emails
                </Text>
                <TextInput
                  value={domainInput}
                  onChangeText={(value) => {
                    setDomainInput(value);
                    setFormError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="alerts@hdfcbank.net, noreply@icicibank.com"
                  placeholderTextColor="#71717A"
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Comma separated. Found {domainCount} sender {domainCount === 1 ? "entry" : "entries"}.
                </Text>
              </View>

              {formError ? <Text className="text-sm text-red-500">{formError}</Text> : null}
            </View>

            <View className="mb-3 flex-row gap-3">
              <Pressable
                onPress={handleCreateAccount}
                disabled={isSaving}
                className="flex-1 items-center justify-center rounded-xl px-4 py-3"
                style={{ backgroundColor: isSaving ? withOpacity(colors.primary, 0.45) : colors.primary }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.onTopOfPrimary} />
                ) : (
                  <Text className="text-sm font-semibold" style={{ color: colors.onTopOfPrimary }}>
                    Save account
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setDrawerOpen(false);
                  resetForm();
                }}
                className="items-center justify-center rounded-xl border px-4 py-3"
                style={{ borderColor: withOpacity(colors.primary, 0.35) }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </DrawerContent>
      </Drawer>
    </>
  );
}
