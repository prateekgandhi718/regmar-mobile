import { ReactNode, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { withOpacity } from "@/theme/color-theme";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  LinkedAccountProvider,
  useGetLinkedAccountsQuery,
  useLinkEmailAccountMutation,
  useUnlinkAccountMutation,
} from "@/redux/api/linkedAccountsApi";

type ProviderConfig = {
  id: LinkedAccountProvider;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  emailPlaceholder: string;
  appPasswordUrl: string;
  steps: string[];
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "gmail",
    name: "Gmail",
    icon: "mail",
    emailPlaceholder: "name@gmail.com",
    appPasswordUrl: "https://myaccount.google.com/apppasswords",
    steps: [
      "Open your Google account and create a new app password.",
      "Name it for FIY and copy the 16-character password.",
      "Paste the 16-character code below.",
    ],
  },
  {
    id: "icloud",
    name: "iCloud",
    icon: "cloud",
    emailPlaceholder: "name@icloud.com",
    appPasswordUrl: "https://appleid.apple.com/account/manage",
    steps: [
      "Open your Apple ID account and generate an app-specific password.",
      "Name it for FIY and copy the 16-character password.",
      "Paste the 16-character code below.",
    ],
  },
];

type EmailLinkGateProps = {
  title: string;
  description: string;
  children: ReactNode;
  showLinkedStateWhenLinked?: boolean;
};

export function EmailLinkGate({ title, description, children, showLinkedStateWhenLinked = false }: EmailLinkGateProps) {
  const { isDark } = useTheme();
  const { colors } = useColorTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedProvider, setSelectedProvider] = useState<LinkedAccountProvider>("gmail");
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [formError, setFormError] = useState("");

  const { data: linkedAccounts, isLoading: isLoadingLinkedAccounts } = useGetLinkedAccountsQuery();
  const [linkEmailAccount, { isLoading: isSavingLink }] = useLinkEmailAccountMutation();
  const [unlinkAccount, { isLoading: isUnlinkingAccount }] = useUnlinkAccountMutation();

  const linkedEmailAccount = linkedAccounts?.find((account) => account.isActive);
  const selectedProviderConfig = PROVIDERS.find((provider) => provider.id === selectedProvider) ?? PROVIDERS[0];
  const linkedProvider: LinkedAccountProvider = linkedEmailAccount?.provider === "icloud" ? "icloud" : "gmail";

  const saveButtonLabel = useMemo(() => (drawerMode === "edit" ? "Update" : "Save"), [drawerMode]);

  const resetForm = () => {
    setDrawerMode("create");
    setSelectedProvider("gmail");
    setEmail("");
    setInitialEmail("");
    setAppPassword("");
    setFormError("");
  };

  const openCreateDrawer = (provider: LinkedAccountProvider) => {
    setDrawerMode("create");
    setSelectedProvider(provider);
    setEmail("");
    setInitialEmail("");
    setAppPassword("");
    setFormError("");
    setDrawerOpen(true);
  };

  const openEditDrawer = () => {
    if (!linkedEmailAccount) return;

    setDrawerMode("edit");
    setSelectedProvider(linkedProvider);
    setEmail(linkedEmailAccount.email);
    setInitialEmail(linkedEmailAccount.email);
    setAppPassword("");
    setFormError("");
    setDrawerOpen(true);
  };

  const handleSaveLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = appPassword.replace(/\s+/g, "");
    const isEmailChanged = normalizedEmail !== initialEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setFormError("Email is required.");
      return;
    }

    if (drawerMode === "create" && normalizedPassword.length !== 16) {
      setFormError("App password must be exactly 16 characters.");
      return;
    }

    if (drawerMode === "edit") {
      if (normalizedPassword.length > 0 && normalizedPassword.length !== 16) {
        setFormError("App password must be exactly 16 characters.");
        return;
      }
      if (isEmailChanged && normalizedPassword.length !== 16) {
        setFormError("App password is required when changing email.");
        return;
      }
    }

    try {
      const response = await linkEmailAccount({
        provider: selectedProvider,
        email: normalizedEmail,
        appPassword: normalizedPassword || "",
      }).unwrap();

      Toast.show({
        type: "success",
        text1: drawerMode === "edit" ? "Credentials updated" : "Email linked",
        text2: response.message,
      });

      setDrawerOpen(false);
      resetForm();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      const message = apiError?.data?.message || "Unable to connect to your mailbox. Check your credentials.";
      setFormError(message);
      Toast.show({
        type: "error",
        text1: "Could not save email account",
        text2: message,
      });
    }
  };

  const handleUnlink = () => {
    if (!linkedEmailAccount || isUnlinkingAccount) return;

    Alert.alert("Unlink email account?", "This will disable email sync until you reconnect.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          try {
            await unlinkAccount(linkedEmailAccount.id).unwrap();
            Toast.show({
              type: "success",
              text1: "Email unlinked",
              text2: "You can reconnect anytime from settings.",
            });
            setDrawerOpen(false);
            resetForm();
          } catch (error) {
            const apiError = error as { data?: { message?: string } };
            Toast.show({
              type: "error",
              text1: "Could not unlink account",
              text2: apiError?.data?.message || "Please try again.",
            });
          }
        },
      },
    ]);
  };

  const openAppPasswordHelp = () => {
    Linking.openURL(selectedProviderConfig.appPasswordUrl).catch(() => {
      setFormError("Could not open app password instructions on this device.");
      Toast.show({
        type: "error",
        text1: "Could not open provider page",
      });
    });
  };

  if (isLoadingLinkedAccounts) {
    return (
      <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">Checking linked account...</Text>
        </View>
      </View>
    );
  }

  const linkedStateCard = linkedEmailAccount ? (
    <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withOpacity(colors.primary, 0.14) }}>
            <Feather name="check-circle" size={16} color={colors.primary} />
          </View>
          <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Linked Email</Text>
        </View>
        <View className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
          <Text className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Active
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{linkedEmailAccount.email}</Text>
      <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Provider: {linkedProvider === "icloud" ? "iCloud" : "Gmail"}
      </Text>

      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={openEditDrawer}
          className="rounded-xl border px-4 py-2"
          style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            Edit credentials
          </Text>
        </Pressable>
        <Pressable
          onPress={handleUnlink}
          disabled={isUnlinkingAccount}
          className="rounded-xl border px-4 py-2"
          style={{ borderColor: withOpacity(colors.secondary, 0.5) }}
        >
          {isUnlinkingAccount ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Text className="text-sm font-semibold" style={{ color: colors.secondary }}>
              Unlink email
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  ) : null;

  if (linkedEmailAccount && !showLinkedStateWhenLinked) {
    return <>{children}</>;
  }

  return (
    <>
      {linkedEmailAccount ? (
        linkedStateCard
      ) : (
        <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withOpacity(colors.primary, 0.14) }}>
              <Feather name="mail" size={16} color={colors.primary} />
            </View>
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</Text>
          </View>
          <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{description}</Text>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => openCreateDrawer("gmail")}
              className="flex-row items-center gap-2 rounded-xl border px-4 py-2"
              style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
            >
              <Feather name="mail" size={14} color={colors.primary} />
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                Link Gmail
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openCreateDrawer("icloud")}
              className="flex-row items-center gap-2 rounded-xl border px-4 py-2"
              style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
            >
              <Feather name="cloud" size={14} color={colors.primary} />
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                Link iCloud
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {children}

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
        }}
      >
        <DrawerContent>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            <DrawerHeader>
              <DrawerTitle>{drawerMode === "edit" ? "Edit Email Credentials" : "Link Email Account"}</DrawerTitle>
              <DrawerDescription>
                {drawerMode === "edit"
                  ? "Update email address or app password."
                  : "Choose a provider and add your app-specific password."}
              </DrawerDescription>
            </DrawerHeader>

            <View className="mb-4 flex-row gap-2">
              {PROVIDERS.map((provider) => {
                const isActiveProvider = selectedProvider === provider.id;
                return (
                  <Pressable
                    key={provider.id}
                    onPress={() => {
                      setSelectedProvider(provider.id);
                      setFormError("");
                    }}
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      isActiveProvider ? "" : "bg-transparent"
                    }`}
                    style={
                      isActiveProvider
                        ? { borderColor: colors.primary, backgroundColor: colors.primary }
                        : { borderColor: withOpacity(colors.primary, 0.35) }
                    }
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Feather
                        name={provider.icon}
                        size={14}
                        color={isActiveProvider ? colors.onTopOfPrimary : colors.primary}
                      />
                      <Text className="text-sm font-semibold" style={{ color: isActiveProvider ? colors.onTopOfPrimary : colors.primary }}>
                        {provider.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="gap-3">
              <View>
                <Text className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">Email</Text>
                <TextInput
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={selectedProviderConfig.emailPlaceholder}
                  placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setFormError("");
                  }}
                />
              </View>
              <View>
                <Text className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  App password {drawerMode === "edit" ? "(optional unless email changes)" : ""}
                </Text>
                <TextInput
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  placeholder={drawerMode === "edit" ? "Leave empty to keep current password" : "16-character app password"}
                  placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                  value={appPassword}
                  onChangeText={(value) => {
                    const normalized = value.replace(/\s+/g, "");
                    setAppPassword(normalized.slice(0, 16));
                    setFormError("");
                  }}
                />
              </View>
            </View>

            <View className="mt-4 rounded-xl border border-zinc-200 bg-zinc-100/70 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Create App Password
              </Text>
              {selectedProviderConfig.steps.map((step, index) => (
                <Text key={`${selectedProvider}-${index}`} className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {index + 1}. {step}
                </Text>
              ))}
              <Pressable
                onPress={openAppPasswordHelp}
                className="mt-3 self-start rounded-lg border px-3 py-2"
                style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                  Generate app password
                </Text>
              </Pressable>
            </View>

            {!!formError && <Text className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</Text>}

            <View className="mt-5 flex-row gap-3">
              <Pressable onPress={() => setDrawerOpen(false)} className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-700">
                <Text className="text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveLink} disabled={isSavingLink} className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: colors.primary }}>
                {isSavingLink ? (
                  <ActivityIndicator size="small" color={colors.onTopOfPrimary} />
                ) : (
                  <Text className="text-center text-sm font-semibold" style={{ color: colors.onTopOfPrimary }}>
                    {saveButtonLabel}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </DrawerContent>
      </Drawer>
    </>
  );
}
