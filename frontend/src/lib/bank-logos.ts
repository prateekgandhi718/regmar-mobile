const DOMAIN_MAPPING: Record<string, string> = {
  "axis.bank.in": "axisbank.com",
  "axisbank.com": "axisbank.com",
  "axisbank.in": "axisbank.com",
  "hdfcbank.net": "hdfcbank.com",
  "hdfcbank.com": "hdfcbank.com",
  "icicibank.com": "icicibank.com",
  "icicibank.org": "icicibank.com",
  "sbi.co.in": "sbi.co.in",
  "onlinesbi.com": "sbi.co.in",
  "sbicard.com": "sbicard.com",
  "kotak.com": "kotak.com",
  "yesbank.in": "yesbank.in",
  "yesbank.com": "yesbank.in",
  "idfcfirstbank.com": "idfcfirstbank.com",
  "indusind.com": "indusind.com",
  "rblbank.com": "rblbank.com",
  "federalbank.co.in": "federalbank.co.in",
  "pnb.co.in": "pnbindia.in",
  "pnbindia.in": "pnbindia.in",
  "bankofbaroda.com": "bankofbaroda.in",
  "bankofbaroda.in": "bankofbaroda.in",
  "sib.co.in": "southindianbank.com",
  "idbi.com": "idbibank.in",
  "idbibank.in": "idbibank.in",
  "bankofindia.co.in": "bankofindia.co.in",
  "canarabank.com": "canarabank.com",
  "sc.com": "sc.com",
  "hsbc.co.in": "hsbc.co.in",
  "hsbc.com": "hsbc.com",
};

const LOGO_DEV_KEY = process.env.EXPO_PUBLIC_LOGO_DEV_KEY;

const extractDomain = (emailOrDomain?: string) => {
  if (!emailOrDomain) return "";
  const normalized = emailOrDomain.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("@")) {
    const parts = normalized.split("@");
    return parts[parts.length - 1] || "";
  }
  return normalized;
};

export const inferBankDomain = (emailOrDomain?: string) => {
  const domain = extractDomain(emailOrDomain);
  if (!domain) return "";
  return DOMAIN_MAPPING[domain] || domain;
};

export const getBankLogoUrl = (emailOrDomain?: string) => {
  const domain = inferBankDomain(emailOrDomain);
  if (!domain || !LOGO_DEV_KEY) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}`;
};
