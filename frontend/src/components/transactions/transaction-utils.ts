import type { Transaction } from "@/lib/transactions-types";

export const formatAmount = (amount: number) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatCompactCurrency = (value: number) => {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    const compact = (absolute / 1_000_000).toFixed(absolute % 1_000_000 === 0 ? 0 : 1);
    return `₹${compact}M`;
  }

  if (absolute >= 1_000) {
    const compact = (absolute / 1_000).toFixed(absolute % 1_000 === 0 ? 0 : 1);
    return `₹${compact}K`;
  }

  return `₹${formatAmount(absolute)}`;
};

export const getEffectiveDate = (tx: Transaction) => new Date(tx.newDate || tx.originalDate);

export const getEffectiveAmount = (tx: Transaction) => tx.newAmount ?? tx.originalAmount;

export const isDebitTransaction = (tx: Transaction) => (tx.userType || tx.type) === "debit";

export const getMerchantName = (tx: Transaction) =>
  (tx.newDescription || tx.originalDescription || "Unknown Merchant").trim();

export const isInvestment = (tx: Transaction) =>
  tx.categoryId?.name?.trim().toLowerCase() === "investment";

export const isSelfTransfer = (tx: Transaction) =>
  tx.categoryId?.name?.trim().toLowerCase() === "self transfer";

export const isExpenseTransaction = (tx: Transaction) => {
  if (!isDebitTransaction(tx)) return false;
  if (tx.refunded) return false;
  if (isInvestment(tx)) return false;
  if (isSelfTransfer(tx)) return false;
  return true;
};

export const getSignedExpenseAmount = (tx: Transaction) => {
  if (isExpenseTransaction(tx)) {
    return getEffectiveAmount(tx);
  }
  if (!isDebitTransaction(tx)) {
    return -getEffectiveAmount(tx);
  }
  return 0;
};

export const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  }).toUpperCase();

export const formatDayLabel = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

export const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatTimeInputValue = (date: Date) => {
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
};

export const combineDateAndTime = (dateValue: string, timeValue: string) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
