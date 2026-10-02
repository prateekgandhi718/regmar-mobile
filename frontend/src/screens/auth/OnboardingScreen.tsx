import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MocoLogo } from "@/components/moco-logo";
import { getOrCreateDeviceUuid, saveAuthTokens, setOnboardingCompleted, setStoredName } from "@/lib/auth-storage";
import { useRegisterDeviceMutation } from "@/redux/api/authApi";
import type { LinkedAccountProvider } from "@/redux/api/linkedAccountsApi";
import { useLinkEmailAccountMutation } from "@/redux/api/linkedAccountsApi";
import { setOnboardingComplete, setSession } from "@/redux/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const getAppPasswordUrl = (provider: LinkedAccountProvider) =>
  provider === "icloud" ? "https://appleid.apple.com/account/manage" : "https://myaccount.google.com/apppasswords";

const PROVIDER_OPTIONS = [
  { id: "gmail" as const, label: "Gmail", icon: "mail" as const },
  { id: "icloud" as const, label: "iCloud", icon: "cloud" as const },
];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [provider, setProvider] = useState<LinkedAccountProvider>("gmail");
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registerDevice, { isLoading: isRegistering }] = useRegisterDeviceMutation();
  const [linkEmailAccount, { isLoading: isLinking }] = useLinkEmailAccountMutation();

  const isLoading = isRegistering || isLinking;

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = appPassword.replace(/\s+/g, "");

    if (normalizedPassword.length !== 16) {
      setError("App password must be exactly 16 characters.");
      return;
    }

    setError(null);

    try {
      if (!isAuthenticated) {
        const deviceUuid = await getOrCreateDeviceUuid();
        const response = await registerDevice({ deviceUuid, name: normalizedEmail }).unwrap();

        await Promise.all([
          setStoredName(normalizedEmail),
          saveAuthTokens(response.accessToken, response.refreshToken),
          setOnboardingCompleted(false),
        ]);

        dispatch(
          setSession({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            onboardingComplete: false,
          }),
        );
      }

      await linkEmailAccount({
        provider,
        email: normalizedEmail,
        appPassword: normalizedPassword,
      }).unwrap();

      await setOnboardingCompleted(true);
      dispatch(setOnboardingComplete(true));
    } catch (requestError) {
      const apiError = requestError as { data?: { message?: string } };
      setError(apiError?.data?.message || "Unable to connect to your mailbox. Check your credentials.");
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 18 }]}>
        <View style={styles.headerRow}>
          <MocoLogo size={34} />
          <Text style={styles.headerTitle}>Connect your email</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.title}>Start with your email</Text>
            <Text style={styles.subtitle}>
              Enter your email and app password to securely connect your mailbox and sync your transactions.
            </Text>
          </View>

          <View style={styles.providerRow} accessibilityRole="tablist">
            {PROVIDER_OPTIONS.map((item) => {
              const isActive = provider === item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setProvider(item.id);
                    if (error) setError(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  style={[styles.providerPill, isActive ? styles.providerPillActive : null]}
                >
                  <Feather name={item.icon} size={15} color={isActive ? "#F7E26B" : "#D4D4D8"} />
                  <Text style={[styles.providerPillText, isActive ? styles.providerPillTextActive : null]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formBlock}>
            <View>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder={provider === "icloud" ? "name@icloud.com" : "name@gmail.com"}
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>App password</Text>
              <TextInput
                value={appPassword}
                onChangeText={(value) => {
                  setAppPassword(value.replace(/\s+/g, "").slice(0, 16));
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder="16-character app password"
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
            </View>
          </View>

          <Pressable
            onPress={() =>
              Linking.openURL(getAppPasswordUrl(provider)).catch(() => setError("Could not open the app password instructions."))
            }
            style={styles.helpButton}
          >
            <Feather name="external-link" size={16} color="#F4F4F5" />
            <Text style={styles.helpButtonText}>Create an app password</Text>
          </Pressable>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What is an app password?</Text>
            <Text style={styles.infoText}>
              It is a generated key from your email provider that lets moco securely read transaction emails when two-factor protection is enabled.
            </Text>
            <Text style={styles.infoText}>You can revoke it from your provider settings at any time.</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <Pressable
          onPress={handleSubmit}
          disabled={isLoading}
          style={[styles.submitButton, isLoading ? styles.submitButtonDisabled : null]}
        >
          {isLoading ? <ActivityIndicator color="#111827" /> : <Text style={styles.submitButtonText}>Continue</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: "#09090B",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#E4E4E7",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerSpacer: {
    width: 34,
  },
  scrollView: {
    flex: 1,
    marginTop: 34,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    marginBottom: 34,
  },
  providerRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  providerPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#3F3F46",
    borderRadius: 14,
    backgroundColor: "#18181B",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  providerPillActive: {
    borderColor: "rgba(247,226,107,0.72)",
    backgroundColor: "rgba(247,226,107,0.14)",
  },
  providerPillText: {
    color: "#D4D4D8",
    fontSize: 14,
    fontWeight: "600",
  },
  providerPillTextActive: {
    color: "#F7E26B",
  },
  title: {
    color: "#FAFAFA",
    fontSize: 44,
    lineHeight: 50,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  subtitle: {
    color: "#D4D4D8",
    fontSize: 18,
    lineHeight: 28,
    marginTop: 16,
  },
  formBlock: {
    gap: 18,
  },
  fieldLabel: {
    color: "#D4D4D8",
    fontSize: 14,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 16,
    backgroundColor: "#09090B",
    color: "#F4F4F5",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  helpButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#3F3F46",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  helpButtonText: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 16,
    backgroundColor: "#09090B",
    padding: 16,
  },
  infoTitle: {
    color: "#F4F4F5",
    fontSize: 16,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  infoText: {
    color: "#D4D4D8",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  errorText: {
    color: "#F87171",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#A1A1AA",
  },
  submitButtonText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "600",
  },
});
