import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountSetupGate } from "@/components/accounts/AccountSetupGate";
import { Factbox, Folio, Headline, Masthead, NewspaperLayout, PaperButton, Rule } from "@/components/newspaper";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { PAPER, PAPER_FONTS } from "@/theme/newspaper-theme";

export function AccountsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: accounts = [] } = useGetAccountsQuery();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <NewspaperLayout scroll>
        <Masthead title="ACCOUNTS" kicker="The connected ledger" edition="Vol. I · No. 3" date={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        <Folio page="A3" section="ACCOUNTS" publication="MOCO" date="CURRENT EDITION" />
        <View style={styles.headerRow}><Headline weight="Medium">The source of the record.</Headline><Pressable onPress={() => navigation.navigate("AccountSetup")} style={styles.addButton}><Feather name="plus" size={17} color={PAPER.page} /></Pressable></View>
        {accounts.length ? (
          <AccountSetupGate title="Add another account" description="Create a bank account profile with currency and sender domains." showAccountsList><View /></AccountSetupGate>
        ) : (
          <Factbox title="No accounts yet" accent><Text style={styles.bodyCopy}>Add your first bank account to give transactions a reliable home.</Text><PaperButton onPress={() => navigation.navigate("AccountSetup")}>Add an account</PaperButton></Factbox>
        )}
        <View style={styles.footerRule}><Rule variant="double" /></View>
        <Text style={styles.note}>Accounts are used to organize imported transactions. Sender domains remain optional for manual-only records.</Text>
      </NewspaperLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAPER.page },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  addButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: PAPER.accent },
  bodyCopy: { fontFamily: PAPER_FONTS.body, color: PAPER.body, fontSize: 15, lineHeight: 22, marginBottom: 14 },
  footerRule: { marginTop: 28 },
  note: { fontFamily: PAPER_FONTS.bodyItalic, color: PAPER.secondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
});
