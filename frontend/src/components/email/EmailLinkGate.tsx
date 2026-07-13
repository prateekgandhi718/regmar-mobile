import { ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import {
  isLinkedAccountActive,
  LinkedAccountProvider,
  useGetLinkedAccountsQuery,
  useUnlinkAccountMutation,
} from "@/redux/api/linkedAccountsApi";
import { withOpacity } from "@/theme/color-theme";

type EmailLinkGateProps = {
  title: string;
  description: string;
  children: ReactNode;
  showLinkedStateWhenLinked?: boolean;
};

export function EmailLinkGate({ title, description, children, showLinkedStateWhenLinked = false }: EmailLinkGateProps) {
  const { colors } = useColorTheme();
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
      <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#D4D4D8" />
          <Text className="text-sm text-zinc-300">Checking linked account...</Text>
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
        <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withOpacity(colors.primary, 0.14) }}>
                <Feather name="check-circle" size={16} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold text-zinc-100">Linked Email</Text>
            </View>
            <View className="rounded-full bg-zinc-800 px-2 py-1">
              <Text className="text-xs font-semibold text-zinc-300">Active</Text>
            </View>
          </View>

          <Text className="mt-2 text-base font-semibold text-zinc-100">{linkedEmailAccount.email}</Text>
          <Text className="mt-1 text-sm text-zinc-400">Provider: {linkedProvider === "icloud" ? "iCloud" : "Gmail"}</Text>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() =>
                navigation.navigate("EmailCredentials", {
                  mode: "edit",
                  provider: linkedProvider,
                  email: linkedEmailAccount.email,
                })
              }
              className="rounded-xl border px-4 py-2"
              style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                Edit credentials
              </Text>
            </Pressable>

            <Pressable onPress={handleUnlink} disabled={isUnlinkingAccount} className="rounded-xl border px-4 py-2" style={{ borderColor: withOpacity(colors.secondary, 0.5) }}>
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
      ) : (
        <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withOpacity(colors.primary, 0.14) }}>
              <Feather name="mail" size={16} color={colors.primary} />
            </View>
            <Text className="text-lg font-bold text-zinc-100">{title}</Text>
          </View>
          <Text className="mt-2 text-sm text-zinc-400">{description}</Text>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() =>
                navigation.navigate("EmailCredentials", {
                  mode: "create",
                  provider: "gmail",
                })
              }
              className="flex-row items-center gap-2 rounded-xl border px-4 py-2"
              style={{ borderColor: withOpacity(colors.primary, 0.45), backgroundColor: withOpacity(colors.primary, 0.08) }}
            >
              <Feather name="mail" size={14} color={colors.primary} />
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
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
    </>
  );
}
