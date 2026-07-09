import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { withOpacity } from "@/theme/color-theme";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";
import type { LinkedAccountProvider } from "@/redux/api/linkedAccountsApi";
import { useLinkEmailAccountMutation } from "@/redux/api/linkedAccountsApi";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, "EmailCredentials">;

const PROVIDER_COPY: Record<LinkedAccountProvider, { title: string; placeholder: string; appPasswordUrl: string }> = {
  gmail: {
    title: "Gmail",
    placeholder: "name@gmail.com",
    appPasswordUrl: "https://myaccount.google.com/apppasswords",
  },
  icloud: {
    title: "iCloud",
    placeholder: "name@icloud.com",
    appPasswordUrl: "https://appleid.apple.com/account/manage",
  },
};

export function EmailCredentialsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { colors } = useColorTheme();
  const { mode, provider: initialProvider, email: initialEmailParam } = route.params;
  const [provider, setProvider] = useState<LinkedAccountProvider>(initialProvider);
  const [email, setEmail] = useState(initialEmailParam ?? "");
  const [initialEmail] = useState((initialEmailParam ?? "").trim().toLowerCase());
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkEmailAccount, { isLoading }] = useLinkEmailAccountMutation();

  const providerCopy = PROVIDER_COPY[provider];
  const title = mode === "edit" ? "Edit email link" : `Connect ${providerCopy.title}`;
  const subtitle =
    mode === "edit"
      ? "Update your linked email or rotate your app password."
      : "Enter your email and app password to finish linking.";
  const actionLabel = mode === "edit" ? "Update credentials" : "Link email";
  const passwordLabel = mode === "edit" ? "App password (optional unless email changes)" : "App password";
  const passwordPlaceholder = mode === "edit" ? "Leave empty to keep current password" : "16-character app password";

  const providerPills = useMemo(
    () => [
      { id: "gmail" as const, label: "Gmail", icon: "mail" as const },
      { id: "icloud" as const, label: "iCloud", icon: "cloud" as const },
    ],
    [],
  );

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = appPassword.replace(/\s+/g, "");
    const isEmailChanged = normalizedEmail !== initialEmail;

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    if (mode === "create" && normalizedPassword.length !== 16) {
      setError("App password must be exactly 16 characters.");
      return;
    }

    if (mode === "edit") {
      if (normalizedPassword.length > 0 && normalizedPassword.length !== 16) {
        setError("App password must be exactly 16 characters.");
        return;
      }

      if (isEmailChanged && normalizedPassword.length !== 16) {
        setError("App password is required when changing email.");
        return;
      }
    }

    setError(null);
    try {
      const response = await linkEmailAccount({
        provider,
        email: normalizedEmail,
        appPassword: normalizedPassword || "",
      }).unwrap();

      Toast.show({
        type: "success",
        text1: mode === "edit" ? "Credentials updated" : "Email linked",
        text2: response.message,
      });
      navigation.goBack();
    } catch (requestError) {
      const apiError = requestError as { data?: { message?: string } };
      const message = apiError?.data?.message || "Unable to connect to your mailbox. Check your credentials.";
      setError(message);
      Toast.show({
        type: "error",
        text1: "Could not save email account",
        text2: message,
      });
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
            <Feather name="arrow-left" size={18} color="#E4E4E7" />
          </Pressable>
          <Text style={styles.headerTitle}>{mode === "edit" ? "Edit credentials" : "Link email"}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.providerRow}>
            {providerPills.map((item) => {
              const active = item.id === provider;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setProvider(item.id);
                    setError(null);
                  }}
                  style={[
                    styles.providerPill,
                    active ? { borderColor: withOpacity(colors.primary, 0.72), backgroundColor: withOpacity(colors.primary, 0.18) } : null,
                  ]}
                >
                  <Feather name={item.icon} size={14} color={active ? colors.primary : "#D4D4D8"} />
                  <Text style={[styles.providerPillText, active ? { color: colors.primary } : null]}>{item.label}</Text>
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
                placeholder={providerCopy.placeholder}
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>{passwordLabel}</Text>
              <TextInput
                value={appPassword}
                onChangeText={(value) => {
                  setAppPassword(value.replace(/\s+/g, "").slice(0, 16));
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder={passwordPlaceholder}
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
            </View>
          </View>

          <Pressable
            onPress={() => {
              Linking.openURL(providerCopy.appPasswordUrl).catch(() => {
                setError("Could not open app password instructions on this device.");
              });
            }}
            style={styles.helpButton}
          >
            <Feather name="external-link" size={16} color="#F4F4F5" />
            <Text style={styles.helpButtonText}>Create app password</Text>
          </Pressable>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What is an app password?</Text>
            <Text style={styles.infoText}>
              It is a generated key from your email provider that allows secure access when 2-factor protection is enabled.
            </Text>
            <Text style={styles.infoText}>You can revoke this key from your provider settings at any time.</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <Pressable onPress={handleSubmit} disabled={isLoading} style={[styles.submitButton, isLoading ? styles.submitButtonLoading : null]}>
          {isLoading ? <ActivityIndicator color="#111827" /> : <Text style={styles.submitButtonText}>{actionLabel}</Text>}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.24)",
    backgroundColor: "rgba(24,24,27,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#E4E4E7",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scrollView: {
    marginTop: 22,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  titleWrap: {
    marginBottom: 28,
  },
  title: {
    color: "#FAFAFA",
    fontSize: 42,
    lineHeight: 48,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 12,
    color: "#D4D4D8",
    fontSize: 16,
    lineHeight: 28,
  },
  providerRow: {
    flexDirection: "row",
    gap: 10,
  },
  providerPill: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.2)",
    backgroundColor: "rgba(24,24,27,0.86)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  providerPillText: {
    color: "#D4D4D8",
    fontSize: 15,
    fontWeight: "700",
  },
  formBlock: {
    marginTop: 18,
    gap: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    color: "#D4D4D8",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  fieldInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.16)",
    backgroundColor: "rgba(24,24,27,0.94)",
    color: "#F4F4F5",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  helpButton: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.24)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  helpButtonText: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "700",
  },
  infoCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.14)",
    backgroundColor: "rgba(24,24,27,0.86)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoTitle: {
    color: "#FAFAFA",
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
  },
  infoText: {
    marginTop: 8,
    color: "#D4D4D8",
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    marginTop: 12,
    color: "#FCA5A5",
    fontSize: 13,
  },
  submitButton: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  submitButtonLoading: {
    opacity: 0.75,
  },
  submitButtonText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
});
