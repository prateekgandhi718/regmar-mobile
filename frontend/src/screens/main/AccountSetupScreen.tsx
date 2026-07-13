import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useAddAccountMutation } from "@/redux/api/accountsApi";
import { DISPLAY_FONT_FAMILY } from "@/theme/typography";

const parseDomainNames = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export function AccountSetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [addAccount, { isLoading: isSaving }] = useAddAccountMutation();

  const [bankName, setBankName] = useState("");
  const [domains, setDomains] = useState("");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const normalizedTitle = bankName.trim();
    const domainNames = parseDomainNames(domains);
    const normalizedLast4 = last4.trim();

    if (!normalizedTitle) {
      setError("Bank name is required.");
      return;
    }

    if (normalizedLast4 && !/^\d{4}$/.test(normalizedLast4)) {
      setError("Last 4 digits must be exactly 4 numbers.");
      return;
    }

    setError(null);

    try {
      await addAccount({
        title: normalizedTitle,
        currency: "INR",
        domainNames,
        accountNumber: normalizedLast4 || undefined,
      }).unwrap();

      Toast.show({
        type: "success",
        text1: "Account added",
      });
      navigation.goBack();
    } catch (requestError) {
      const apiError = requestError as { data?: { message?: string } };
      setError(apiError?.data?.message || "Could not create account.");
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
            <Feather name="arrow-left" size={18} color="#E4E4E7" />
          </Pressable>
          <Text style={styles.headerTitle}>Add account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.title}>Add an account</Text>
            <Text style={styles.subtitle}>Add your bank account now. Sender domains are optional for automatic syncing.</Text>
          </View>

          <View style={styles.formBlock}>
            <View>
              <Text style={styles.fieldLabel}>Bank name</Text>
              <TextInput
                value={bankName}
                onChangeText={(value) => {
                  setBankName(value);
                  if (error) setError(null);
                }}
                autoCapitalize="words"
                placeholder="HDFC Bank"
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Domain(s) (optional)</Text>
              <TextInput
                value={domains}
                onChangeText={(value) => {
                  setDomains(value);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="alerts@hdfcbank.net, noreply@hdfcbank.com"
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
              <Text style={styles.fieldHint}>
                Add sender domains later if you want automatic email syncing.
              </Text>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Last 4 digits (optional)</Text>
              <TextInput
                value={last4}
                onChangeText={(value) => {
                  setLast4(value.replace(/\D+/g, "").slice(0, 4));
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                placeholder="1234"
                placeholderTextColor="#71717A"
                style={styles.fieldInput}
              />
            </View>

            {!!error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>

        <Pressable onPress={handleSave} disabled={isSaving} style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]}>
          {isSaving ? <ActivityIndicator color="#111827" /> : <Text style={styles.saveButtonText}>Save account</Text>}
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
  },
  content: {
    paddingBottom: 26,
  },
  hero: {
    marginTop: 18,
  },
  title: {
    color: "#FAFAFA",
    fontSize: 44,
    lineHeight: 50,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 12,
    color: "#D4D4D8",
    fontSize: 17,
    lineHeight: 28,
  },
  formBlock: {
    marginTop: 22,
    gap: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    color: "#D4D4D8",
    fontSize: 13,
  },
  fieldInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(228,228,231,0.14)",
    backgroundColor: "rgba(24,24,27,0.92)",
    color: "#F4F4F5",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  fieldHint: {
    marginTop: 8,
    color: "#A1A1AA",
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
  },
  saveButton: {
    marginTop: "auto",
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#A1A1AA",
  },
  saveButtonText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
});
