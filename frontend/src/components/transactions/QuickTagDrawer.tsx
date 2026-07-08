import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CategoryIcon } from "@/components/category-icon";
import type { Transaction } from "@/lib/transactions-types";
import { useGetCategoriesQuery } from "@/redux/api/categoriesApi";
import { useDeleteTransactionMutation, useUpdateTransactionMutation } from "@/redux/api/transactionsApi";
import { formatAmount, getEffectiveAmount, getMerchantName, isDebitTransaction } from "@/components/transactions/transaction-utils";

type QuickTagDrawerProps = {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
};

export function QuickTagDrawer({ transaction, open, onClose }: QuickTagDrawerProps) {
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const [updateTransaction, { isLoading: isTagging }] = useUpdateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

  if (!transaction) return null;

  const amount = getEffectiveAmount(transaction);
  const isDebit = isDebitTransaction(transaction);
  const merchant = getMerchantName(transaction);

  const handleSelectCategory = async (categoryId: string, categoryName: string) => {
    try {
      await updateTransaction({
        clientTxnId: transaction.clientTxnId,
        categoryId: {
          _id: categoryId,
          name: categoryName,
        },
      }).unwrap();
      onClose();
    } catch (error) {
      const apiError = error as { data?: { message?: string }; error?: string };
      Toast.show({
        type: "error",
        text1: "Could not tag transaction",
        text2: apiError?.data?.message || apiError?.error || "Please try again.",
      });
    }
  };

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
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <DrawerTitle>Quick Tag</DrawerTitle>
            <View style={styles.headerSpacer} />
          </View>
        </DrawerHeader>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text numberOfLines={2} style={styles.summaryMerchant}>
                {merchant}
              </Text>
              <Text style={[styles.summaryAmount, isDebit ? styles.debitText : styles.creditText]}>
                ₹{formatAmount(amount)}
              </Text>
            </View>
            <Text style={styles.summaryMeta}>{transaction.accountId?.title?.toUpperCase() || "ACCOUNT"}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            {isLoadingCategories ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#D4D4D8" />
              </View>
            ) : (
              <View style={styles.categoryWrap}>
                {categories.map((category) => {
                  const isSelected = transaction.categoryId?._id === category._id;
                  return (
                    <Pressable
                      key={category._id}
                      disabled={isTagging}
                      onPress={() => handleSelectCategory(category._id, category.name)}
                      style={[styles.categoryChip, isSelected ? styles.categoryChipActive : null]}
                    >
                      <CategoryIcon name={category.name} color="#D4D4D8" size={16} />
                      <Text style={styles.categoryChipText}>{category.name.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <Pressable
            disabled={isDeleting}
            onPress={handleDelete}
            style={[styles.deleteButton, isDeleting ? styles.deleteButtonDisabled : null]}
          >
            <Text style={styles.deleteText}>{isDeleting ? "Deleting..." : "Delete Transaction"}</Text>
          </Pressable>
        </ScrollView>
      </DrawerContent>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 44,
  },
  cancelText: {
    color: "#E4E4E7",
    fontWeight: "700",
    fontSize: 14,
  },
  content: {
    paddingBottom: 12,
    gap: 20,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#111114",
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryMerchant: {
    flex: 1,
    color: "#F4F4F5",
    fontSize: 16,
    fontWeight: "700",
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryMeta: {
    color: "#A1A1AA",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  debitText: {
    color: "#F4F4F5",
  },
  creditText: {
    color: "#A7F3D0",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  loadingWrap: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.38)",
  },
  categoryChipText: {
    color: "#F4F4F5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  deleteButton: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(127,29,29,0.22)",
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.72,
  },
  deleteText: {
    color: "#FB7185",
    fontSize: 12,
    fontWeight: "700",
  },
});
