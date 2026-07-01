export type ThemePalette = {
  primary: string;
  secondary: string;
  tertiary: string;
};

export type SemanticColors = ThemePalette & {
  onTopOfPrimary: string;
  onTopOfSecondary: string;
  onTopOfTertiary: string;
};

export const DEFAULT_THEME_PALETTE: ThemePalette = {
  primary: "#2563EB",
  secondary: "#F97316",
  tertiary: "#22C55E",
};

export const THEME_PALETTE_STORAGE_KEY = "theme.palette.v1";

const HEX_6_REGEX = /^#[0-9a-fA-F]{6}$/;

type RGB = {
  r: number;
  g: number;
  b: number;
};

export const isValidHexColor = (value: string) => HEX_6_REGEX.test(value.trim());

export const normalizeHexColor = (value: string) => value.trim().toUpperCase();

const hexToRgb = (hex: string): RGB | null => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }

  return { r, g, b };
};

const srgbToLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
};

export const getReadableForeground = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";

  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.5 ? "#0A0A0A" : "#FFFFFF";
};

export const withOpacity = (hex: string, opacity: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const boundedOpacity = Math.max(0, Math.min(1, opacity));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${boundedOpacity})`;
};

export const isValidThemePalette = (palette: ThemePalette) =>
  isValidHexColor(palette.primary) && isValidHexColor(palette.secondary) && isValidHexColor(palette.tertiary);

export const normalizeThemePalette = (palette: ThemePalette): ThemePalette => ({
  primary: normalizeHexColor(palette.primary),
  secondary: normalizeHexColor(palette.secondary),
  tertiary: normalizeHexColor(palette.tertiary),
});

export const createSemanticColors = (palette: ThemePalette): SemanticColors => {
  const normalized = normalizeThemePalette(palette);

  return {
    ...normalized,
    onTopOfPrimary: getReadableForeground(normalized.primary),
    onTopOfSecondary: getReadableForeground(normalized.secondary),
    onTopOfTertiary: getReadableForeground(normalized.tertiary),
  };
};
