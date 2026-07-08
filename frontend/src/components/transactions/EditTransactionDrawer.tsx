import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CategoryIcon } from "@/components/category-icon";
import type { Transaction } from "@/lib/transactions-types";
import { useGetCategoriesQuery } from "@/redux/api/categoriesApi";
import { useDeleteTransactionMutation, useUpdateTransactionMutation } from "@/redux/api/transactionsApi";
import {
  combineDateAndTime,
  formatAmount,
  formatDateInputValue,
  formatTimeInputValue,
  getEffectiveAmount,
  getEffectiveDate,
  getMerchantName,
  isDebitTransaction,
} from "@/components/transactions/transaction-utils";

type EditTransactionDrawerProps = {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
};

export function EditTransactionDrawer({ transaction, open, onClose }: EditTransactionDrawerProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const [updateTransaction, { isLoading: isSaving }] = useUpdateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

  const effectiveDate = useMemo(() => (transaction ? getEffectiveDate(transaction) : new Date()), [transaction]);
  const effectiveAmount = useMemo(() => (transaction ? getEffectiveAmount(transaction) : 0), [transaction]);
  const isDebit = transaction ? isDebitTransaction(transaction) : true;

  const [description, setDescription] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [refunded, setRefunded] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction || !open) return;

    setDescription(getMerchantName(transaction));
    setDateInput(formatDateInputValue(effectiveDate));
    setTimeInput(formatTimeInputValue(effectiveDate));
    setAmountInput(`${isDebit ? "" : "-"}${effectiveAmount}`);
    setRefunded(Boolean(transaction.refunded));
    setSelectedCategoryId(transaction.categoryId?._id || null);
  }, [transaction, open, effectiveDate, effectiveAmount, isDebit]);

  if (!transaction) return null;

  const parsedAmount = Number.parseFloat(amountInput);
  const isCredited = Number.isFinite(parsedAmount) && parsedAmount < 0;
  const isDebited = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSave = async () => {
    const parsedDate = combineDateAndTime(dateInput, timeInput);
    const parsedValue = Number.parseFloat(amountInput);

    if (!parsedDate) {
      Toast.show({
        type: "error",
        text1: "Invalid date or time",
        text2: "Please use valid date and time values.",
      });
      return;
    }

    if (!Number.isFinite(parsedValue) || parsedValue === 0) {
      Toast.show({
        type: "error",
        text1: "Invalid amount",
        text2: "Amount must be a non-zero number.",
      });
      return;
    }

    const isCredit = parsedValue < 0;
    const absoluteAmount = Math.abs(parsedValue);
    const selectedCategory = categories.find((item) => item._id === selectedCategoryId);

    try {
      await updateTransaction({
        clientTxnId: transaction.clientTxnId,
        newDescription: description.trim() || transaction.originalDescription,
        newAmount: absoluteAmount,
        newDate: parsedDate.toISOString(),
        userType: isCredit ? "credit" : "debit",
        refunded,
        categoryId: selectedCategory
          ? {
              _id: selectedCategory._id,
              name: selectedCategory.name,
            }
          : null,
      }).unwrap();
      onClose();
    } catch (error) {
      const apiError = error as { data?: { message?: string }; error?: string };
      Toast.show({
        type: "error",
        text1: "Could not update transaction",
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

  const toggleAmountSign = () => {
    if (!amountInput.trim()) return;
    const value = Number.parseFloat(amountInput);
    if (!Number.isFinite(value)) return;
    setAmountInput((value * -1).toString());
  };

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <DrawerTitle>Edit Transaction</DrawerTitle>
            <Pressable onPress={handleDelete} disabled={isDeleting} style={styles.deleteIconButton}>
              <Feather name="trash-2" size={18} color="#FB7185" />
            </Pressable>
          </View>
        </DrawerHeader>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Original</Text>
            <Text style={styles.originalLine}>{transaction.originalDescription}</Text>
            <Text style={styles.originalLine}>₹{formatAmount(transaction.originalAmount)}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Merchant description"
              placeholderTextColor="#71717A"
              style={styles.input}
            />

            <View style={styles.twoColumnRow}>
              <View style={styles.columnField}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  value={dateInput}
                  onChangeText={setDateInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="2026-07-08"
                  placeholderTextColor="#71717A"
                  style={styles.input}
                />
              </View>
              <View style={[styles.columnField, styles.timeField]}>
                <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                <TextInput
                  value={timeInput}
                  onChangeText={setTimeInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="18:30"
                  placeholderTextColor="#71717A"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountWrap}>
              <Pressable onPress={toggleAmountSign} style={[styles.amountSignButton, isCredited ? styles.amountSignCredit : styles.amountSignDebit]}>
                <Feather name={isCredited ? "minus-circle" : isDebited ? "plus-circle" : "info"} size={18} color="#FFFFFF" />
              </Pressable>
              <TextInput
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="decimal-pad"
                placeholder="Enter amount"
                placeholderTextColor="#71717A"
                style={styles.amountInput}
              />
            </View>
            <Text style={styles.amountHint}>
              {isCredited
                ? "This will count as credited (income)."
                : isDebited
                  ? "This will count as debited (expense)."
                  : "Use +/- to switch transaction direction."}
            </Text>

            <View style={styles.refundedRow}>
              <View style={styles.refundedCopy}>
                <Text style={styles.refundedTitle}>Refunded / Reversed</Text>
                <Text style={styles.refundedSubtitle}>Removes this transaction from totals and summaries.</Text>
              </View>
              <Switch value={refunded} onValueChange={setRefunded} trackColor={{ true: "#A1A1AA", false: "#3F3F46" }} />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryWrap}>
              {categories.map((category) => {
                const isSelected = category._id === selectedCategoryId;
                return (
                  <Pressable
                    key={category._id}
                    onPress={() => setSelectedCategoryId((current) => (current === category._id ? null : category._id))}
                    style={[styles.categoryChip, isSelected ? styles.categoryChipActive : null]}
                  >
                    <CategoryIcon name={category.name} color="#D4D4D8" size={16} />
                    <Text style={styles.categoryText}>{category.name.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={onClose} style={[styles.actionButton, styles.cancelButton]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable disabled={isSaving} onPress={handleSave} style={[styles.actionButton, styles.saveButton]}>
              <Text style={styles.saveText}>{isSaving ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>
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
    width: 36,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127,29,29,0.2)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
  },
  content: {
    gap: 12,
    paddingBottom: 12,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111114",
    padding: 14,
    gap: 10,
  },
  sectionLabel: {
    color: "#A1A1AA",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  originalLine: {
    color: "#E4E4E7",
    fontSize: 13,
    fontWeight: "600",
  },
  inputLabel: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(9,9,11,0.6)",
    color: "#F4F4F5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(9,9,11,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  amountSignButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#52525B",
  },
  amountSignDebit: {
    backgroundColor: "#FB7185",
  },
  amountSignCredit: {
    backgroundColor: "#10B981",
  },
  amountInput: {
    flex: 1,
    color: "#F4F4F5",
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 0,
  },
  amountHint: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
  },
  columnField: {
    flex: 1,
    gap: 6,
  },
  timeField: {
    maxWidth: 128,
  },
  refundedRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  refundedCopy: {
    flex: 1,
    gap: 3,
  },
  refundedTitle: {
    color: "#F4F4F5",
    fontSize: 13,
    fontWeight: "700",
  },
  refundedSubtitle: {
    color: "#A1A1AA",
    fontSize: 11,
    lineHeight: 16,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryChipActive: {
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  categoryText: {
    color: "#F4F4F5",
    fontSize: 11,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelButton: {
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(24,24,27,0.9)",
  },
  saveButton: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  cancelText: {
    color: "#E4E4E7",
    fontWeight: "700",
    fontSize: 13,
  },
  saveText: {
    color: "#F4F4F5",
    fontWeight: "800",
    fontSize: 13,
  },
});
