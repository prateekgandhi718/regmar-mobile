import { NEWSPAPER_FONTS } from "./typography";

export const PAPER = {
  page: "#F5F6F4",
  surface: "#FFFFFF",
  ink: "#1A1A1A",
  body: "#22201C",
  secondary: "#4A4742",
  muted: "#6E6A63",
  quote: "#2E2A24",
  hairline: "#C9CCC9",
  decorative: "#1A1A1A",
  accent: "#7A1F1F",
  accentSoft: "#B96A5E",
  highlight: "#EDF0EC",
  blueInk: "#1B2A4A",
  white: "#FFFFFF",
} as const;

export const PAPER_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const PAPER_FONTS = NEWSPAPER_FONTS;

export type PaperColor = keyof typeof PAPER;

export const newspaperText = {
  headline: {
    fontFamily: PAPER_FONTS.display,
    color: PAPER.ink,
    fontWeight: "600" as const,
  },
  subhead: {
    fontFamily: PAPER_FONTS.bodyItalic,
    color: PAPER.secondary,
    fontStyle: "italic" as const,
  },
  body: {
    fontFamily: PAPER_FONTS.body,
    color: PAPER.body,
  },
  meta: {
    fontFamily: PAPER_FONTS.metaMedium,
    color: PAPER.secondary,
    letterSpacing: 0.8,
  },
  kicker: {
    fontFamily: PAPER_FONTS.metaBold,
    color: PAPER.accent,
    letterSpacing: 1.2,
  },
} as const;

export const hairline = {
  borderColor: PAPER.hairline,
  borderWidth: 1,
} as const;

export const pageStyle = {
  backgroundColor: PAPER.page,
} as const;
