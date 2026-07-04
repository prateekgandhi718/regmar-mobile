import * as SecureStore from "expo-secure-store";
import type { InvestmentData } from "@/lib/investments-types";

const INVESTMENT_PAN_KEY = "investments.pan";
const INVESTMENT_DATA_KEY = "investments.data";

export const sanitizePan = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

export const isValidPan = (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);

export const getStoredInvestmentPan = async () => {
  const value = await SecureStore.getItemAsync(INVESTMENT_PAN_KEY);
  return value ? sanitizePan(value) : null;
};

export const saveInvestmentPan = async (pan: string) => {
  const normalized = sanitizePan(pan);
  if (!isValidPan(normalized)) {
    throw new Error("Invalid PAN number");
  }
  await SecureStore.setItemAsync(INVESTMENT_PAN_KEY, normalized);
  return normalized;
};

export const getStoredInvestment = async (): Promise<InvestmentData | null> => {
  const raw = await SecureStore.getItemAsync(INVESTMENT_DATA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as InvestmentData;
  } catch {
    await SecureStore.deleteItemAsync(INVESTMENT_DATA_KEY);
    return null;
  }
};

export const saveInvestment = async (investment: InvestmentData) => {
  await SecureStore.setItemAsync(INVESTMENT_DATA_KEY, JSON.stringify(investment));
};

export const clearStoredInvestment = async () => {
  await SecureStore.deleteItemAsync(INVESTMENT_DATA_KEY);
};
