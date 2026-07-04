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
  primary: "#FF4D6D",
  secondary: "#F4C84A",
  tertiary: "#69E3B0",
};

type RGB = {
  r: number;
  g: number;
  b: number;
};

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

export const createSemanticColors = (palette: ThemePalette): SemanticColors => {
  return {
    ...palette,
    onTopOfPrimary: getReadableForeground(palette.primary),
    onTopOfSecondary: getReadableForeground(palette.secondary),
    onTopOfTertiary: getReadableForeground(palette.tertiary),
  };
};
