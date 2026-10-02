import { ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import {
  isLinkedAccountActive,
  LinkedAccountProvider,
  useGetLinkedAccountsQuery,
  useUnlinkAccountMutation,
} from "@/redux/api/linkedAccountsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

type EmailLinkGateProps = {
  title: string;
  description: string;
  children: ReactNode;
  showLinkedStateWhenLinked?: boolean;
};

export function EmailLinkGate({ title, description, children, showLinkedStateWhenLinked = false }: EmailLinkGateProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: linkedAccounts = [], isLoading: isLoadingLinkedAccounts } = useGetLinkedAccountsQuery();
  const [unlinkAccount, { isLoading: isUnlinkingAccount }] = useUnlinkAccountMutation();

  const linkedEmailAccount = linkedAccounts.find((account) => isLinkedAccountActive(account.isActive));
  const linkedProvider: LinkedAccountProvider = linkedEmailAccount?.provider === "icloud" ? "icloud" : "gmail";

  const handleUnlink = () => {
    if (!linkedEmailAccount || isUnlinkingAccount) return;

    Alert.alert("Unlink email account?", "This will disable email sync until you reconnect.", [
      { text: "Cancel", style: "cancel" },
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

  if (isLoadingLinkedAccounts) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <ActivityIndicator size="small" color={PAPER.muted} />
          <Text style={styles.mutedText}>Checking linked account...</Text>
        </View>
      </View>
    );
  }

  if (linkedEmailAccount && !showLinkedStateWhenLinked) {
    return <>{children}</>;
  }

  return (
    <>
      {linkedEmailAccount ? (
        <View style={styles.card}>
          <View style={styles.betweenRow}>
            <View style={styles.row}>
              <View style={styles.iconBox}>
                <Feather name="check-circle" size={16} color={PAPER.accent} />
              </View>
              <Text style={styles.cardTitle}>Linked Email</Text>
            </View>
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Active</Text>
            </View>
          </View>

          <Text style={styles.emailText}>{linkedEmailAccount.email}</Text>
          <Text style={styles.mutedText}>Provider: {linkedProvider === "icloud" ? "iCloud" : "Gmail"}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                navigation.navigate("EmailCredentials", {
                  mode: "edit",
                  provider: linkedProvider,
                  email: linkedEmailAccount.email,
                })
              }
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Edit credentials
              </Text>
            </Pressable>

            <Pressable onPress={handleUnlink} disabled={isUnlinkingAccount} style={styles.secondaryButton}>
              {isUnlinkingAccount ? (
                <ActivityIndicator size="small" color={PAPER.muted} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Unlink email
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Feather name="mail" size={16} color={PAPER.accent} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <Text style={styles.mutedText}>{description}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                navigation.navigate("EmailCredentials", {
                  mode: "create",
                  provider: "gmail",
                })
              }
              style={[styles.primaryButton, styles.inlineButton]}
            >
              <Feather name="mail" size={14} color={PAPER.accent} />
              <Text style={styles.primaryButtonText}>
                Link Gmail
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate("EmailCredentials", {
                  mode: "create",
                  provider: "icloud",
                })
              }
              style={[styles.primaryButton, styles.inlineButton]}
            >
              <Feather name="cloud" size={14} color={PAPER.accent} />
              <Text style={styles.primaryButtonText}>
                Link iCloud
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {children}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 24, borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.surface, padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  betweenRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBox: { width: 32, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: PAPER.highlight },
  cardTitle: { color: PAPER.ink, fontFamily: PAPER_FONTS.display, fontSize: 20 },
  activeChip: { borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.highlight, paddingHorizontal: 8, paddingVertical: 4 },
  activeChipText: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaBold, fontSize: 11, textTransform: "uppercase" },
  emailText: { color: PAPER.ink, fontFamily: PAPER_FONTS.metaMedium, fontSize: 15, marginTop: 2 },
  mutedText: { color: PAPER.secondary, fontFamily: PAPER_FONTS.body, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  primaryButton: { borderWidth: 1, borderColor: PAPER.accent, backgroundColor: PAPER.highlight, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  inlineButton: { flex: 1, justifyContent: "center" },
  primaryButtonText: { color: PAPER.accent, fontFamily: PAPER_FONTS.metaBold, fontSize: 12 },
  secondaryButton: { borderWidth: 1, borderColor: PAPER.hairline, backgroundColor: PAPER.page, paddingHorizontal: 12, paddingVertical: 9, justifyContent: "center" },
  secondaryButtonText: { color: PAPER.secondary, fontFamily: PAPER_FONTS.metaBold, fontSize: 12 },
});
