import { ReactNode, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Animated, Image, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getBankLogoUrl } from "@/lib/bank-logos";
import type { MainTabParamList } from "@/navigation/MainTabsNavigator";
import { useAddAccountMutation, useDeleteAccountMutation, useGetAccountsQuery, useUpdateAccountMutation } from "@/redux/api/accountsApi";
import type { Account } from "@/redux/api/accountsApi";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

const parseDomainNames = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

type AccountSetupGateProps = {
  title: string;
  description: string;
  children: ReactNode;
  showPromptOnly?: boolean;
  showAccountsList?: boolean;
};

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
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [last4Input, setLast4Input] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [formError, setFormError] = useState("");

  const { data: accounts = [], isLoading: isLoadingAccounts } = useGetAccountsQuery();
  const [addAccount, { isLoading: isSaving }] = useAddAccountMutation();
  const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  const hasAccounts = accounts.length > 0;
  const shouldShowPrompt = !hasAccounts;

  const domainCount = useMemo(() => parseDomainNames(domainInput).length, [domainInput]);

  const resetForm = () => {
    setTitleInput("");
    setCurrency("INR");
    setLast4Input("");
    setDomainInput("");
    setFormError("");
    setDrawerMode("create");
    setEditingAccountId(null);
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingAccountId(null);
    setTitleInput("");
    setCurrency("INR");
    setLast4Input("");
    setDomainInput("");
    setFormError("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (account: (typeof accounts)[number]) => {
    setDrawerMode("edit");
    setEditingAccountId(account._id);
    setTitleInput(account.title);
    setCurrency(account.currency || "INR");
    setLast4Input(account.accountNumber ? account.accountNumber.slice(-4) : "");
    setDomainInput((account.domainIds || []).map((item) => item.fromEmail).join(", "));
    setFormError("");
    setDrawerOpen(true);
  };

  const handleCreateAccount = async () => {
    const normalizedTitle = titleInput.trim();
    const domainNames = parseDomainNames(domainInput);
    if (!normalizedTitle) {
      setFormError("Account name is required.");
      return;
    }

    try {
      const response = await addAccount({
        title: normalizedTitle,
        currency,
        domainNames,
        accountNumber: last4Input.trim() ? last4Input : undefined,
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

  const handleSaveAccount = async () => {
    if (drawerMode === "edit") {
      const normalizedTitle = titleInput.trim();
      const domainNames = parseDomainNames(domainInput);
      if (!normalizedTitle) {
        setFormError("Account name is required.");
        return;
      }
      if (!editingAccountId) {
        setFormError("Account not found.");
        return;
      }
      try {
        const response = await updateAccount({
          clientAccountId: editingAccountId,
          title: normalizedTitle,
          currency,
          domainNames,
          accountNumber: last4Input.trim() ? last4Input : undefined,
        }).unwrap();
        Toast.show({
          type: "success",
          text1: "Account updated",
          text2: `${response.title} updated successfully.`,
        });
        setDrawerOpen(false);
        resetForm();
      } catch (error) {
        const apiError = error as { data?: { message?: string } };
        setFormError(apiError?.data?.message || "Could not update account.");
        Toast.show({
          type: "error",
          text1: "Failed to update account",
          text2: apiError?.data?.message || "Please try again.",
        });
      }
      return;
    }
    await handleCreateAccount();
  };

  const handleDeleteAccount = async () => {
    if (!editingAccountId || isDeletingAccount) return;
    if (isDeletingAccount) return;
    try {
      await deleteAccount(editingAccountId).unwrap();
      Toast.show({
        type: "success",
        text1: "Account deleted",
      });
      setDrawerOpen(false);
      resetForm();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      Toast.show({
        type: "error",
        text1: "Could not delete account",
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
          onPress={openCreateDrawer}
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

  const accountCards = showAccountsList && hasAccounts ? (
    <View className="mt-6 gap-3">
      {accounts.map((account) => {
        const logoUrl = getBankLogoUrl(account.domainIds[0]?.fromEmail);
        const domainCount = account.domainIds.length;
        return (
          <InteractiveAccountCard
            key={account._id}
            account={account}
            logoUrl={logoUrl}
            domainCount={domainCount}
            onPress={() => openEditDrawer(account)}
          />
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

      {accountCards}
      {children}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.drawerScrollContent}
          >
            <DrawerHeader>
              <DrawerTitle>{drawerMode === "edit" ? "Edit Account" : "Add Account"}</DrawerTitle>
              <DrawerDescription>
                {drawerMode === "edit"
                  ? "Update account details. Sender domains are optional."
                  : "Create an account now; you can add sender domains later for sync."}
              </DrawerDescription>
            </DrawerHeader>

            <View style={styles.drawerForm}>
              <View style={styles.drawerFieldCard}>
                <Text style={styles.drawerLabel}>Account Name</Text>
                <TextInput
                  value={titleInput}
                  onChangeText={(value) => {
                    setTitleInput(value);
                    setFormError("");
                  }}
                  autoCapitalize="words"
                  placeholder="HDFC Salary Account"
                  placeholderTextColor="#71717A"
                  style={styles.drawerInput}
                />
              </View>

              <View style={styles.drawerFieldCard}>
                <Text style={styles.drawerLabel}>Currency</Text>
                <View style={styles.currencyWrap}>
                  {CURRENCIES.map((curr) => {
                    const active = curr === currency;
                    return (
                      <Pressable
                        key={curr}
                        onPress={() => setCurrency(curr)}
                        style={[styles.currencyChip, active ? styles.currencyChipActive : null]}
                      >
                        <Text style={[styles.currencyChipText, active ? styles.currencyChipTextActive : null]}>
                          {curr}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.drawerFieldCard}>
                <Text style={styles.drawerLabel}>Account Last 4 Digits</Text>
                <TextInput
                  value={last4Input}
                  onChangeText={(value) => {
                    setLast4Input(value.replace(/\D/g, "").slice(0, 4));
                    setFormError("");
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="1234"
                  placeholderTextColor="#71717A"
                  style={styles.drawerInput}
                />
              </View>

              <View style={styles.drawerFieldCard}>
                <Text style={styles.drawerLabel}>Sender Domains / Emails (Optional)</Text>
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
                  style={styles.drawerInput}
                />
                <Text style={styles.drawerHint}>
                  Comma separated. Found {domainCount} sender {domainCount === 1 ? "entry" : "entries"}. Leave blank for manual-only account.
                </Text>
              </View>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </View>
            <View style={styles.drawerActionRow}>
              {drawerMode === "edit" ? (
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  style={[styles.drawerActionButton, styles.drawerDeleteButton]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                >
                  {isDeletingAccount ? (
                    <ActivityIndicator size="small" color="#FCA5A5" />
                  ) : (
                    <Feather name="trash-2" size={15} color="#FCA5A5" />
                  )}
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setDrawerOpen(false);
                  resetForm();
                }}
                style={[styles.drawerActionButton, styles.drawerCancelButton]}
              >
                <Text style={styles.drawerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveAccount}
                disabled={isSaving || isUpdating}
                style={[
                  styles.drawerActionButton,
                  styles.drawerSaveButton,
                  isSaving || isUpdating ? styles.drawerSaveButtonDisabled : null,
                ]}
              >
                {isSaving || isUpdating ? (
                  <ActivityIndicator size="small" color="#F4F4F5" />
                ) : (
                  <Text style={styles.drawerSaveText}>
                    {drawerMode === "edit" ? "Update account" : "Save account"}
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

type InteractiveAccountCardProps = {
  account: Account;
  logoUrl: string | null;
  domainCount: number;
  onPress: () => void;
};

function InteractiveAccountCard({ account, logoUrl, domainCount, onPress }: InteractiveAccountCardProps) {
  const scale = useState(() => new Animated.Value(1))[0];
  const tiltX = useState(() => new Animated.Value(0))[0];
  const tiltY = useState(() => new Animated.Value(0))[0];
  const [cardSize, setCardSize] = useState({ width: 1, height: 1 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCardSize({ width, height });
    }
  };

  const animateReset = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }),
      Animated.spring(tiltX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  };

  const animatePressAt = (locationX: number, locationY: number) => {
    const xRatio = (locationX / cardSize.width - 0.5) * 2;
    const yRatio = (locationY / cardSize.height - 0.5) * 2;
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.986, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(tiltX, { toValue: -yRatio * 2.2, useNativeDriver: true, speed: 24, bounciness: 3 }),
      Animated.spring(tiltY, { toValue: xRatio * 2.2, useNativeDriver: true, speed: 24, bounciness: 3 }),
    ]).start();
  };

  const handlePressIn = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = event.nativeEvent;
    animatePressAt(locationX, locationY);
  };

  const animatedStyle = {
    transform: [
      { perspective: 900 },
      {
        rotateX: tiltX.interpolate({
          inputRange: [-8, 8],
          outputRange: ["-8deg", "8deg"],
        }),
      },
      {
        rotateY: tiltY.interpolate({
          inputRange: [-8, 8],
          outputRange: ["-8deg", "8deg"],
        }),
      },
      { scale },
    ],
  } as const;

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={animateReset} onLayout={handleLayout}>
      <Animated.View style={[styles.accountCard, animatedStyle]}>
        <View pointerEvents="none" style={styles.glowOrbLarge} />
        <View pointerEvents="none" style={styles.glowOrbSmall} />

        <View className="flex-row items-start justify-between">
          <View>
            <Text style={styles.metaLine}>{account.currency}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{domainCount}</Text>
          </View>
        </View>

        <View style={styles.accountCardBody}>
          <View style={styles.accountTitleBlock}>
                <Text numberOfLines={2} style={styles.accountTitleLine}>
                  {account.title}
                </Text>
                <Text style={styles.accountHintLine}>
                  x{account.accountNumber ? account.accountNumber.slice(-4) : "XXXX"}
                </Text>
              </View>
          <View style={styles.logoBadge}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Text style={styles.logoFallback}>{account.title.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  drawerScrollContent: {
    paddingBottom: 8,
  },
  drawerForm: {
    marginBottom: 12,
    gap: 10,
  },
  drawerFieldCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111114",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  drawerLabel: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  drawerInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(9,9,11,0.6)",
    color: "#F4F4F5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  drawerHint: {
    color: "#71717A",
    fontSize: 11,
  },
  currencyWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  currencyChipActive: {
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  currencyChipText: {
    color: "#D4D4D8",
    fontSize: 12,
    fontWeight: "700",
  },
  currencyChipTextActive: {
    color: "#F4F4F5",
  },
  formError: {
    color: "#FB7185",
    fontSize: 13,
    fontWeight: "600",
  },
  drawerActionRow: {
    marginBottom: 4,
    flexDirection: "row",
    gap: 10,
  },
  drawerActionButton: {
    minWidth: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerDeleteButton: {
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(127,29,29,0.28)",
    paddingHorizontal: 14,
  },
  drawerCancelButton: {
    flex: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(24,24,27,0.9)",
  },
  drawerSaveButton: {
    flex: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  drawerSaveButtonDisabled: {
    opacity: 0.72,
  },
  drawerCancelText: {
    color: "#E4E4E7",
    fontSize: 13,
    fontWeight: "700",
  },
  drawerSaveText: {
    color: "#F4F4F5",
    fontSize: 13,
    fontWeight: "800",
  },
  accountCard: {
    minHeight: 162,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#101013",
  },
  glowOrbLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -60,
    bottom: -80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glowOrbSmall: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 999,
    right: 36,
    top: -82,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  metaLine: {
    color: "#D4D4D8",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  countBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(9,9,11,0.42)",
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E4E4E7",
  },
  accountCardBody: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  accountTitleBlock: {
    flex: 1,
  },
  accountContextLine: {
    color: "#E4E4E7",
    fontSize: 18,
    lineHeight: 24,
    fontStyle: "italic",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  accountTitleLine: {
    marginTop: 0,
    fontSize: 25,
    lineHeight: 29,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
    color: "#F4F4F5",
  },
  accountHintLine: {
    marginTop: 8,
    color: "#A1A1AA",
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  logoBadge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(9,9,11,0.44)",
    alignItems: "center",
    justifyContent: "center",
    padding: 9,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    color: "#F4F4F5",
    fontSize: 30,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
});
