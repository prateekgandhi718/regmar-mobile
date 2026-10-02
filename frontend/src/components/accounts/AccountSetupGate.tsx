import { ReactNode, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Animated, Image, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getBankLogoUrl } from "@/lib/bank-logos";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useAddAccountMutation, useDeleteAccountMutation, useGetAccountsQuery, useUpdateAccountMutation } from "@/redux/api/accountsApi";
import type { Account } from "@/redux/api/accountsApi";
import { withOpacity } from "@/theme/color-theme";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    <View style={styles.promptCard}>
      <View style={styles.promptHeader}>
        <View style={styles.promptIcon}>
          <Feather name="credit-card" size={16} color={colors.primary} />
        </View>
        <Text style={styles.promptTitle}>{title}</Text>
      </View>
      <Text style={styles.promptDescription}>{description}</Text>

      <View style={styles.promptActions}>
        <Pressable
          onPress={openCreateDrawer}
          style={[styles.promptButton, { borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }]}
        >
          <Feather name="plus" size={14} color={colors.primary} />
          <Text style={[styles.promptButtonText, { color: colors.primary }]}>
            Add account
          </Text>
        </Pressable>
        {showPromptOnly ? (
          <Pressable
            onPress={() => navigation.navigate("Accounts")}
            style={[styles.promptButton, { borderColor: withOpacity(colors.secondary, 0.45), backgroundColor: withOpacity(colors.secondary, 0.08) }]}
          >
            <Feather name="arrow-right-circle" size={14} color={colors.secondary} />
            <Text style={[styles.promptButtonText, { color: colors.secondary }]}>
              Go to Accounts
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const accountCards = showAccountsList && hasAccounts ? (
    <View style={styles.accountCards}>
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
        <View style={styles.loadingCard}>
          <View style={styles.promptHeader}>
            <ActivityIndicator size="small" color={PAPER.accent} />
            <Text style={styles.promptDescription}>Loading accounts...</Text>
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

        <View style={styles.accountCardTopRow}>
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
  promptCard: { marginTop: 24, borderTopWidth: 3, borderTopColor: PAPER.decorative, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, backgroundColor: PAPER.surface, padding: 16 },
  promptHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  promptIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.highlight },
  promptTitle: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 20 },
  promptDescription: { marginTop: 8, color: PAPER.secondary, fontFamily: PAPER_FONTS.body, fontSize: 14, lineHeight: 20 },
  promptActions: { marginTop: 16, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  promptButton: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  promptButtonText: { fontFamily: PAPER_FONTS.metaBold, fontSize: 11, letterSpacing: 0.5 },
  accountCards: { marginTop: 20, gap: 10 },
  loadingCard: { marginTop: 20, borderTopWidth: 3, borderTopColor: PAPER.decorative, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, backgroundColor: PAPER.surface, padding: 16 },
  drawerScrollContent: {
    paddingBottom: 8,
  },
  drawerForm: {
    marginBottom: 12,
    gap: 10,
  },
  drawerFieldCard: {
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  drawerLabel: {
    color: PAPER.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  drawerInput: {
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.page,
    color: PAPER.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  drawerHint: {
    color: PAPER.muted,
    fontSize: 11,
  },
  currencyWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyChip: {
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.page,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  currencyChipActive: {
    borderColor: PAPER.ink,
    backgroundColor: PAPER.highlight,
  },
  currencyChipText: {
    color: PAPER.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  currencyChipTextActive: {
    color: PAPER.ink,
  },
  formError: {
    color: PAPER.accent,
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
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerDeleteButton: {
    borderColor: PAPER.accent,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
  },
  drawerCancelButton: {
    flex: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
  },
  drawerSaveButton: {
    flex: 1,
    borderColor: PAPER.accent,
    backgroundColor: PAPER.accent,
  },
  drawerSaveButtonDisabled: {
    opacity: 0.72,
  },
  drawerCancelText: {
    color: PAPER.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  drawerSaveText: {
    color: PAPER.page,
    fontSize: 13,
    fontWeight: "800",
  },
  accountCard: {
    minHeight: 162,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.surface,
  },
  accountCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  glowOrbLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -60,
    bottom: -80,
    backgroundColor: PAPER.highlight,
  },
  glowOrbSmall: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 999,
    right: 36,
    top: -82,
    backgroundColor: PAPER.page,
  },
  metaLine: {
    color: PAPER.secondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  countBadge: {
    borderWidth: 1,
    borderColor: PAPER.hairline,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: PAPER.page,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: PAPER.ink,
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
    color: PAPER.ink,
    fontSize: 18,
    lineHeight: 24,
    fontStyle: "italic",
    fontFamily: PAPER_FONTS.bodyItalic,
  },
  accountTitleLine: {
    marginTop: 0,
    fontSize: 25,
    lineHeight: 29,
    fontFamily: PAPER_FONTS.display,
    color: PAPER.ink,
  },
  accountHintLine: {
    marginTop: 8,
    color: PAPER.muted,
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  logoBadge: {
    width: 62,
    height: 62,
    borderWidth: 1,
    borderColor: PAPER.hairline,
    backgroundColor: PAPER.page,
    alignItems: "center",
    justifyContent: "center",
    padding: 9,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    color: PAPER.accent,
    fontSize: 30,
    fontFamily: PAPER_FONTS.display,
  },
});
