const LOGO_DEV_KEY = process.env.EXPO_PUBLIC_LOGO_DEV_KEY;

const getEncodedName = (value?: string) => {
  if (!value) return "";
  return encodeURIComponent(value.trim().toLowerCase());
};

export const getMutualFundLogoUrl = (amc?: string) => {
  if (!LOGO_DEV_KEY) return null;
  const encodedName = getEncodedName(amc);
  if (!encodedName) return null;
  return `https://img.logo.dev/name/${encodedName}?token=${LOGO_DEV_KEY}`;
};

export const getStockLogoUrl = (isin?: string) => {
  if (!LOGO_DEV_KEY || !isin) return null;
  return `https://img.logo.dev/isin/${isin}?token=${LOGO_DEV_KEY}`;
};
