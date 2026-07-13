import { useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CategoryIcon } from "@/components/category-icon";
import { getBankLogoUrl } from "@/lib/bank-logos";
import type { Transaction } from "@/lib/transactions-types";
import { useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useGetCategoriesQuery } from "@/redux/api/categoriesApi";
import { useCreateTransactionMutation, useDeleteTransactionMutation, useGetTransactionsQuery, useUpdateTransactionMutation } from "@/redux/api/transactionsApi";
import {
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
  mode?: "edit" | "create";
};

type AccountOption = {
  id: string;
  userId: string;
  title: string;
  currency: string;
  accountNumber?: string;
  fromEmail?: string;
};

const MANUAL_ENTRY_ACCOUNT_ID = "manual-entry";
const LEGACY_MANUAL_ACCOUNT_ID = "manual-local-account";
const LEGACY_MANUAL_EMAIL = "manual@local";

export function EditTransactionDrawer({ transaction, open, onClose, mode = "edit" }: EditTransactionDrawerProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: transactions = [] } = useGetTransactionsQuery();
  const [updateTransaction, { isLoading: isSavingUpdate }] = useUpdateTransactionMutation();
  const [createTransaction, { isLoading: isSavingCreate }] = useCreateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

  const isCreateMode = mode === "create";
  const isSaving = isCreateMode ? isSavingCreate : isSavingUpdate;

  const effectiveDate = useMemo(() => (transaction ? getEffectiveDate(transaction) : new Date()), [transaction]);
  const effectiveAmount = useMemo(() => (transaction ? getEffectiveAmount(transaction) : 0), [transaction]);
  const isDebit = transaction ? isDebitTransaction(transaction) : true;

  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [refunded, setRefunded] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [dateTimeValue, setDateTimeValue] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [activePickerMode, setActivePickerMode] = useState<"date" | "time">("date");
  const [isPickerMounted, setIsPickerMounted] = useState(false);
  const pickerReveal = useRef(new Animated.Value(0)).current;

  const accountOptions = useMemo<AccountOption[]>(() => {
    const map = new Map<string, AccountOption>();

    map.set(MANUAL_ENTRY_ACCOUNT_ID, {
      id: MANUAL_ENTRY_ACCOUNT_ID,
      userId: "manual-local-user",
      title: "Manual entry",
      currency: "INR",
    });

    for (const account of accounts) {
      if (account._id === LEGACY_MANUAL_ACCOUNT_ID) continue;
      map.set(account._id, {
        id: account._id,
        userId: account.userId,
        title: account.title,
        currency: account.currency || "INR",
        accountNumber: account.accountNumber,
        fromEmail: account.domainIds?.[0]?.fromEmail,
      });
    }

    for (const tx of transactions) {
      if (!tx.accountId?._id) continue;
      if (tx.accountId._id === MANUAL_ENTRY_ACCOUNT_ID || tx.accountId._id === LEGACY_MANUAL_ACCOUNT_ID) continue;
      if (tx.domainId?.fromEmail === LEGACY_MANUAL_EMAIL) continue;
      if (map.has(tx.accountId._id)) continue;
      map.set(tx.accountId._id, {
        id: tx.accountId._id,
        userId: tx.accountId.userId || tx.userId || "local",
        title: tx.accountId.title || "Account",
        currency: tx.accountId.currency || "INR",
        accountNumber: tx.accountId.accountNumber,
        fromEmail: tx.domainId?.fromEmail,
      });
    }

    return Array.from(map.values());
  }, [accounts, transactions]);

  const selectedAccount = useMemo(
    () => accountOptions.find((account) => account.id === selectedAccountId) || null,
    [accountOptions, selectedAccountId],
  );
  const selectedAccountLogoUrl = selectedAccount ? getBankLogoUrl(selectedAccount.fromEmail) : null;

  useEffect(() => {
    if (!open) return;

    if (isCreateMode) {
      const now = new Date();
      setDescription("");
      setDateTimeValue(now);
      setAmountInput("");
      setRefunded(false);
      setSelectedCategoryId(null);
      setSelectedAccountId(accountOptions[0]?.id || null);
      setIsAccountDropdownOpen(false);
      setPickerMode(null);
      return;
    }

    if (!transaction) return;

    const isLegacyManualTransaction =
      transaction.accountId?._id === LEGACY_MANUAL_ACCOUNT_ID || transaction.domainId?.fromEmail === LEGACY_MANUAL_EMAIL;
    const defaultAccountId =
      isLegacyManualTransaction || !transaction.accountId?._id
        ? MANUAL_ENTRY_ACCOUNT_ID
        : transaction.accountId._id;

    setDescription(getMerchantName(transaction));
    setDateTimeValue(effectiveDate);
    setAmountInput(`${isDebit ? "" : "-"}${effectiveAmount}`);
    setRefunded(Boolean(transaction.refunded));
    setSelectedCategoryId(transaction.categoryId?._id || null);
    setSelectedAccountId(defaultAccountId);
    setIsAccountDropdownOpen(false);
    setPickerMode(null);
  }, [transaction, open, effectiveDate, effectiveAmount, isDebit, isCreateMode, accountOptions]);

  useEffect(() => {
    if (!open) return;
    if (!selectedAccountId && accountOptions.length) {
      setSelectedAccountId(accountOptions[0].id);
      return;
    }
    if (selectedAccountId && !accountOptions.some((item) => item.id === selectedAccountId)) {
      setSelectedAccountId(MANUAL_ENTRY_ACCOUNT_ID);
    }
  }, [open, selectedAccountId, accountOptions]);

  useEffect(() => {
    if (pickerMode) {
      setActivePickerMode(pickerMode);
      if (!isPickerMounted) {
        setIsPickerMounted(true);
      }
      Animated.timing(pickerReveal, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }).start();
      return;
    }

    if (!isPickerMounted) return;
    Animated.timing(pickerReveal, {
      toValue: 0,
      duration: 170,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsPickerMounted(false);
      }
    });
  }, [isPickerMounted, pickerMode, pickerReveal]);

  if (!isCreateMode && !transaction) return null;

  const parsedAmount = Number.parseFloat(amountInput);
  const isCredited = Number.isFinite(parsedAmount) && parsedAmount < 0;
  const isDebited = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSave = async () => {
    const parsedValue = Number.parseFloat(amountInput);

    if (!description.trim()) {
      Toast.show({
        type: "error",
        text1: "Description required",
        text2: "Please enter a merchant/transaction description.",
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
    const isManualEntry = selectedAccount?.id === MANUAL_ENTRY_ACCOUNT_ID;

    if (isCreateMode && !selectedAccount) {
      Toast.show({
        type: "error",
        text1: "Account required",
        text2: "Add or select an account before recording this transaction.",
      });
      return;
    }

    try {
      if (isCreateMode) {
        await createTransaction({
          clientTxnId: `manual-${Crypto.randomUUID()}`,
          description: description.trim(),
          amount: absoluteAmount,
          date: dateTimeValue.toISOString(),
          userType: isCredit ? "credit" : "debit",
          accountId: !isManualEntry ? selectedAccountId || undefined : undefined,
          accountMeta: selectedAccount && !isManualEntry
            ? {
                _id: selectedAccount.id,
                userId: selectedAccount.userId,
                title: selectedAccount.title,
                currency: selectedAccount.currency,
                accountNumber: selectedAccount.accountNumber,
                fromEmail: selectedAccount.fromEmail,
              }
            : undefined,
          categoryId: selectedCategory
            ? {
                _id: selectedCategory._id,
                name: selectedCategory.name,
              }
            : null,
        }).unwrap();
      } else {
        await updateTransaction({
          clientTxnId: transaction!.clientTxnId,
          newDescription: description.trim() || transaction!.originalDescription,
          newAmount: absoluteAmount,
          newDate: dateTimeValue.toISOString(),
          userType: isCredit ? "credit" : "debit",
          refunded,
          accountId: !isManualEntry ? selectedAccountId || undefined : undefined,
          accountMeta: selectedAccount && !isManualEntry
            ? {
                _id: selectedAccount.id,
                userId: selectedAccount.userId,
                title: selectedAccount.title,
                currency: selectedAccount.currency,
                accountNumber: selectedAccount.accountNumber,
                fromEmail: selectedAccount.fromEmail,
              }
            : undefined,
          categoryId: selectedCategory
            ? {
                _id: selectedCategory._id,
                name: selectedCategory.name,
              }
            : null,
        }).unwrap();
      }
      onClose();
    } catch (error) {
      const apiError = error as { data?: { message?: string }; error?: string };
      Toast.show({
        type: "error",
        text1: isCreateMode ? "Could not record transaction" : "Could not update transaction",
        text2: apiError?.data?.message || apiError?.error || "Please try again.",
      });
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

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

  const openDatePicker = () => {
    setIsAccountDropdownOpen(false);
    setPickerMode("date");
  };

  const openTimePicker = () => {
    setIsAccountDropdownOpen(false);
    setPickerMode("time");
  };

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <DrawerTitle>{isCreateMode ? "Record Transaction" : "Edit Transaction"}</DrawerTitle>
            {isCreateMode ? (
              <View style={styles.headerSpacer} />
            ) : (
              <Pressable onPress={handleDelete} disabled={isDeleting} style={styles.deleteIconButton}>
                <Feather name="trash-2" size={18} color="#FB7185" />
              </Pressable>
            )}
          </View>
        </DrawerHeader>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {!isCreateMode && transaction ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Original</Text>
              <Text style={styles.originalLine}>{transaction.originalDescription}</Text>
              <Text style={styles.originalLine}>₹{formatAmount(transaction.originalAmount)}</Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Merchant description"
              placeholderTextColor="#71717A"
              style={styles.input}
            />

            <View style={styles.columnField}>
              <Text style={styles.inputLabel}>Account</Text>
              <View style={styles.accountPickerWrap}>
                <Pressable
                  style={styles.accountPickerButton}
                  onPress={() => setIsAccountDropdownOpen((current) => !current)}
                  disabled={!accountOptions.length}
                >
                  <View style={styles.accountPickerContent}>
                    <View style={styles.accountLogoBadge}>
                      {selectedAccountLogoUrl ? (
                        <Image source={{ uri: selectedAccountLogoUrl }} style={styles.accountLogoImage} resizeMode="contain" />
                      ) : (
                        <Text style={styles.accountLogoFallback}>{(selectedAccount?.title || "A").charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={styles.accountPickerText} numberOfLines={1}>
                      {selectedAccount
                        ? `${selectedAccount.title}${selectedAccount.accountNumber && selectedAccount.id !== MANUAL_ENTRY_ACCOUNT_ID ? ` (${selectedAccount.accountNumber.slice(-4)})` : ""}`
                        : "No accounts available"}
                    </Text>
                  </View>
                  <Feather name={isAccountDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#D4D4D8" />
                </Pressable>

                {isAccountDropdownOpen && accountOptions.length ? (
                  <View style={styles.accountDropdown}>
                    {accountOptions.map((account) => {
                      const isSelected = account.id === selectedAccountId;
                      const logoUrl = getBankLogoUrl(account.fromEmail);
                      return (
                        <Pressable
                          key={account.id}
                          style={[styles.accountOptionRow, isSelected ? styles.accountOptionRowActive : null]}
                          onPress={() => {
                            setSelectedAccountId(account.id);
                            setIsAccountDropdownOpen(false);
                          }}
                        >
                          <View style={styles.accountLogoBadge}>
                            {logoUrl ? (
                              <Image source={{ uri: logoUrl }} style={styles.accountLogoImage} resizeMode="contain" />
                            ) : (
                              <Text style={styles.accountLogoFallback}>{account.title.charAt(0).toUpperCase()}</Text>
                            )}
                          </View>
                          <Text style={styles.accountOptionText} numberOfLines={1}>
                            {account.title}
                            {account.accountNumber && account.id !== MANUAL_ENTRY_ACCOUNT_ID ? ` (${account.accountNumber.slice(-4)})` : ""}
                          </Text>
                          {isSelected ? <Feather name="check" size={16} color="#F4F4F5" /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.columnField}>
                <Text style={styles.inputLabel}>Date</Text>
                <Pressable style={styles.input} onPress={openDatePicker}>
                  <Text style={styles.inputText}>{formatDateInputValue(dateTimeValue)}</Text>
                </Pressable>
              </View>
              <View style={[styles.columnField, styles.timeField]}>
                <Text style={styles.inputLabel}>Time</Text>
                <Pressable style={styles.input} onPress={openTimePicker}>
                  <Text style={styles.inputText}>{formatTimeInputValue(dateTimeValue)}</Text>
                </Pressable>
              </View>
            </View>

            {isPickerMounted ? (
              <Animated.View
                style={[
                  styles.pickerAnimatedWrap,
                  {
                    opacity: pickerReveal,
                    maxHeight: pickerReveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 280],
                    }),
                    transform: [
                      {
                        translateY: pickerReveal.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={dateTimeValue}
                    mode={pickerMode || activePickerMode}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onValueChange={(_, selectedDate) => {
                      if (selectedDate) {
                        setDateTimeValue(selectedDate);
                      }
                    }}
                    onDismiss={() => setPickerMode(null)}
                  />
                  {Platform.OS === "ios" ? (
                    <View style={styles.pickerActions}>
                      <Pressable onPress={() => setPickerMode(null)} style={styles.pickerDoneButton}>
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

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

            {!isCreateMode ? (
              <View style={styles.refundedRow}>
                <View style={styles.refundedCopy}>
                  <Text style={styles.refundedTitle}>Refunded / Reversed</Text>
                  <Text style={styles.refundedSubtitle}>Removes this transaction from totals and summaries.</Text>
                </View>
                <Switch value={refunded} onValueChange={setRefunded} trackColor={{ true: "#A1A1AA", false: "#3F3F46" }} />
              </View>
            ) : null}
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
              <Text style={styles.saveText}>{isSaving ? "Saving..." : isCreateMode ? "Record" : "Save"}</Text>
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
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
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
    justifyContent: "center",
  },
  inputText: {
    color: "#F4F4F5",
    fontSize: 14,
  },
  accountPickerWrap: {
    position: "relative",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(9,9,11,0.6)",
    overflow: "visible",
    zIndex: 40,
  },
  accountPickerButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountPickerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  accountPickerText: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  accountDropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(9,9,11,0.96)",
    zIndex: 80,
    maxHeight: 220,
    overflow: "hidden",
  },
  accountOptionRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountOptionRowActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  accountOptionText: {
    flex: 1,
    color: "#F4F4F5",
    fontSize: 13,
    fontWeight: "600",
  },
  accountLogoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  accountLogoImage: {
    width: 16,
    height: 16,
  },
  accountLogoFallback: {
    color: "#E4E4E7",
    fontSize: 11,
    fontWeight: "700",
  },
  pickerAnimatedWrap: {
    overflow: "hidden",
  },
  pickerWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(9,9,11,0.6)",
    overflow: "hidden",
  },
  pickerActions: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    alignItems: "flex-end",
  },
  pickerDoneButton: {
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pickerDoneText: {
    color: "#F4F4F5",
    fontSize: 12,
    fontWeight: "700",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(24,24,27,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refundedCopy: {
    flex: 1,
    gap: 2,
  },
  refundedTitle: {
    color: "#E4E4E7",
    fontSize: 12,
    fontWeight: "700",
  },
  refundedSubtitle: {
    color: "#A1A1AA",
    fontSize: 11,
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
  categoryText: {
    color: "#F4F4F5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  cancelButton: {
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  saveButton: {
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  cancelText: {
    color: "#D4D4D8",
    fontSize: 13,
    fontWeight: "700",
  },
  saveText: {
    color: "#F4F4F5",
    fontSize: 13,
    fontWeight: "700",
  },
});
