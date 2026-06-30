import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const DEVICE_UUID_KEY = "auth.deviceUuid";
const USER_NAME_KEY = "auth.userName";
const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

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

export const clearAuthTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
};
