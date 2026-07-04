import { createContext, ReactNode, useContext, useMemo } from "react";
import { createSemanticColors, DEFAULT_THEME_PALETTE, SemanticColors, ThemePalette } from "@/theme/color-theme";

type ColorThemeContextValue = {
  palette: ThemePalette;
  colors: SemanticColors;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

type ColorThemeProviderProps = {
  children: ReactNode;
};

export function ColorThemeProvider({ children }: ColorThemeProviderProps) {
  const value = useMemo<ColorThemeContextValue>(
    () => ({
      palette: DEFAULT_THEME_PALETTE,
      colors: createSemanticColors(DEFAULT_THEME_PALETTE),
    }),
    [],
  );

  return <ColorThemeContext.Provider value={value}>{children}</ColorThemeContext.Provider>;
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within ColorThemeProvider");
  }

  return context;
}
