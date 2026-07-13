import { Feather } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CategoryIcon } from "@/components/category-icon";
import { FiyLogo } from "@/components/fiy-logo";
import { getBankLogoUrl } from "@/lib/bank-logos";
import type { Transaction } from "@/lib/transactions-types";
import { useDeleteTransactionMutation } from "@/redux/api/transactionsApi";
import { formatAmount, getEffectiveAmount, getEffectiveDate, getMerchantName, isDebitTransaction } from "@/components/transactions/transaction-utils";

type TransactionDetailDrawerProps = {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onNeedCheckIn: (transaction: Transaction) => void;
  onEdit: () => void;
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;
  if (full.length !== 6) return `rgba(212,212,216,${alpha})`;

  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const getNeedShapeStyle = (key?: string) => {
  switch (key) {
    case "protection":
      return { borderRadius: 22, transform: [{ rotate: "45deg" }] };
    case "fuel":
      return { borderRadius: 999 };
    case "connection":
      return { borderRadius: 28 };
    case "freedom":
      return {
        borderTopLeftRadius: 34,
        borderTopRightRadius: 26,
        borderBottomRightRadius: 34,
        borderBottomLeftRadius: 12,
        transform: [{ rotate: "-14deg" }],
      };
    default:
      return { borderRadius: 22 };
  }
};

export function TransactionDetailDrawer({
  transaction,
  open,
  onClose,
  onNeedCheckIn,
  onEdit,
}: TransactionDetailDrawerProps) {
  const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

  if (!transaction) return null;

  const amount = getEffectiveAmount(transaction);
  const isDebit = isDebitTransaction(transaction);
  const merchant = getMerchantName(transaction);
  const effectiveDate = getEffectiveDate(transaction);
  const dateText = effectiveDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const bankLogoUrl = getBankLogoUrl(transaction.domainId?.fromEmail);
  const isManualEntry =
    transaction.accountId?._id === "manual-local-account" ||
    transaction.domainId?.fromEmail === "manual@local" ||
    transaction.accountId?.title?.toLowerCase() === "manual entry";

  const handleDelete = async () => {
    try {
      await deleteTransaction(transaction.clientTxnId).unwrap();
      onClose();
    } catch (error) {
      const apiError = error as { data?: { message?: string }; error?: string };
      Toast.show({
        type: "error",
        text1: "Could not delete transaction",
        text2: apiError?.data?.message || apiError?.error || "Please try again.",
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Transaction</DrawerTitle>
        </DrawerHeader>

        <View style={styles.content}>
          {transaction.needSelection ? (
            <View style={styles.needHeroCard}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  hexToRgba(transaction.needSelection.color, 0.34),
                  hexToRgba(transaction.needSelection.color, 0.12),
                  "rgba(0,0,0,0)",
                ]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0.25 }}
                end={{ x: 1, y: 0.95 }}
                style={styles.needHeroGradient}
              />
              <View style={styles.needHeroCopyWrap}>
                <Text style={[styles.needHeroWord, { color: transaction.needSelection.color }]}>
                  {transaction.needSelection.word}
                </Text>
                <Text style={styles.needHeroMeta}>{transaction.needSelection.label}</Text>
              </View>
              <View style={styles.needHeroShapeWrap}>
                <View
                  style={[
                    styles.needHeroShape,
                    getNeedShapeStyle(transaction.needSelection.key),
                    { backgroundColor: transaction.needSelection.color },
                  ]}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <View style={styles.iconWrap}>
                {transaction.categoryId ? <CategoryIcon name={transaction.categoryId.name} size={22} color="#D4D4D8" /> : null}
              </View>
              <View style={styles.summaryTextWrap}>
                <Text numberOfLines={2} style={styles.merchantText}>
                  {merchant}
                </Text>
                <Text style={styles.metaText}>{dateText} • {transaction.accountId?.title?.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.amountText, isDebit ? styles.debitText : styles.creditText]}>
              ₹{formatAmount(amount)}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ORIGINAL DESCRIPTION</Text>
            <Text style={styles.infoValue}>{transaction.originalDescription}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ACCOUNT</Text>
            <View style={styles.categoryRow}>
              <View style={styles.smallCategoryIcon}>
                {isManualEntry ? (
                  <Feather name="edit-3" size={16} color="#D4D4D8" />
                ) : bankLogoUrl ? (
                  <Image source={{ uri: bankLogoUrl }} style={styles.bankLogo} resizeMode="contain" />
                ) : (
                  <Text style={styles.bankFallback}>{transaction.accountId?.title?.charAt(0).toUpperCase() || "B"}</Text>
                )}
              </View>
              <View style={styles.accountInfoWrap}>
                <Text style={styles.infoValue}>{(transaction.accountId?.title || "BANK").toUpperCase()}</Text>
              </View>
              <Text style={styles.accountMeta}>Bank • x{transaction.accountId?.accountNumber?.slice(-4) || "XXXX"}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>CATEGORY</Text>
            <View style={styles.categoryRow}>
              <View style={styles.smallCategoryIcon}>
                <CategoryIcon name={transaction.categoryId?.name} size={18} color="#D4D4D8" />
              </View>
              <Text style={styles.infoValue}>{(transaction.categoryId?.name || "Uncategorized").toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                onClose();
                onNeedCheckIn(transaction);
              }}
              style={[styles.iconActionButton, styles.checkInAction]}
            >
              <FiyLogo size={20} />
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                onEdit();
              }}
              style={[styles.actionButton, styles.primaryAction]}
            >
              <Text style={styles.actionPrimaryText}>Edit</Text>
            </Pressable>
          </View>

          <Pressable disabled={isDeleting} onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{isDeleting ? "Deleting..." : "Delete Transaction"}</Text>
          </Pressable>
        </View>
      </DrawerContent>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 10,
  },
  needHeroCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101114",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 142,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  needHeroGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  needHeroCopyWrap: {
    zIndex: 1,
    gap: 4,
    flex: 1,
  },
  needHeroWord: {
    fontFamily: "Times New Roman",
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  needHeroMeta: {
    color: "#D4D4D8",
    fontSize: 12,
    fontWeight: "600",
  },
  needHeroShapeWrap: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  needHeroShape: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  summaryCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#111114",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLeft: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
    gap: 4,
  },
  merchantText: {
    color: "#F4F4F5",
    fontSize: 16,
    fontWeight: "800",
  },
  metaText: {
    color: "#A1A1AA",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  amountText: {
    zIndex: 1,
    fontSize: 24,
    fontWeight: "900",
  },
  debitText: {
    color: "#F4F4F5",
  },
  creditText: {
    color: "#16C784",
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111114",
    padding: 14,
    gap: 8,
  },
  infoLabel: {
    color: "#71717A",
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  infoValue: {
    color: "#E4E4E7",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallCategoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bankLogo: {
    width: 24,
    height: 24,
  },
  bankFallback: {
    color: "#D4D4D8",
    fontSize: 13,
    fontWeight: "800",
  },
  accountInfoWrap: {
    flex: 1,
  },
  accountMeta: {
    color: "#71717A",
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  iconActionButton: {
    width: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  checkInAction: {
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  primaryAction: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  actionPrimaryText: {
    color: "#E4E4E7",
    fontSize: 13,
    fontWeight: "800",
  },
  deleteButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(127,29,29,0.22)",
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 4,
  },
  deleteText: {
    color: "#FB7185",
    fontSize: 13,
    fontWeight: "700",
  },
});
