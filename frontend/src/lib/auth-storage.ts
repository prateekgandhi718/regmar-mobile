import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const DEVICE_UUID_KEY = "auth.deviceUuid";
const USER_NAME_KEY = "auth.userName";
const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";
const ONBOARDING_COMPLETED_KEY = "auth.onboardingCompleted";
const TXN_CRYPTO_KEY = "txn.cryptoKey";

export const getOrCreateDeviceUuid = async () => {
  const existing = await SecureStore.getItemAsync(DEVICE_UUID_KEY);
  if (existing) return existing;

  const next = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_UUID_KEY, next);
  return next;
};

export const getStoredName = async () => SecureStore.getItemAsync(USER_NAME_KEY);

export const setStoredName = async (name: string) => {
  await SecureStore.setItemAsync(USER_NAME_KEY, name);
};

export const getAccessToken = async () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const getRefreshToken = async () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const saveAuthTokens = async (accessToken: string, refreshToken: string) => {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
};

export const getOnboardingCompleted = async () => {
  const value = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
  if (value === null) return null;
  return value === "true";
};

export const setOnboardingCompleted = async (completed: boolean) => {
  await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, completed ? "true" : "false");
};

export const clearAuthTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
};

export const getOrCreateTxnCryptoKey = async () => {
  const existing = await SecureStore.getItemAsync(TXN_CRYPTO_KEY);
  if (existing) return existing;

  const next = `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(TXN_CRYPTO_KEY, next);
  return next;
};

export const clearAllAuthLocalStorage = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(DEVICE_UUID_KEY),
    SecureStore.deleteItemAsync(USER_NAME_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY),
    SecureStore.deleteItemAsync(TXN_CRYPTO_KEY),
  ]);
};
