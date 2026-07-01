import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  createSemanticColors,
  DEFAULT_THEME_PALETTE,
  isValidThemePalette,
  normalizeThemePalette,
  SemanticColors,
  ThemePalette,
  THEME_PALETTE_STORAGE_KEY,
} from "@/theme/color-theme";

type ColorThemeContextValue = {
  palette: ThemePalette;
  colors: SemanticColors;
  isPaletteReady: boolean;
  setPalette: (nextPalette: ThemePalette) => Promise<void>;
  resetPalette: () => Promise<void>;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

type ColorThemeProviderProps = {
  children: ReactNode;
};

export function ColorThemeProvider({ children }: ColorThemeProviderProps) {
  const [palette, setPaletteState] = useState<ThemePalette>(DEFAULT_THEME_PALETTE);
  const [isPaletteReady, setIsPaletteReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadThemePalette = async () => {
      try {
        const storedPaletteString = await SecureStore.getItemAsync(THEME_PALETTE_STORAGE_KEY);
        if (!active || !storedPaletteString) return;

        const parsedPalette = JSON.parse(storedPaletteString) as Partial<ThemePalette>;
        const nextPalette: ThemePalette = {
          primary: parsedPalette.primary ?? DEFAULT_THEME_PALETTE.primary,
          secondary: parsedPalette.secondary ?? DEFAULT_THEME_PALETTE.secondary,
          tertiary: parsedPalette.tertiary ?? DEFAULT_THEME_PALETTE.tertiary,
        };

        if (isValidThemePalette(nextPalette)) {
          setPaletteState(normalizeThemePalette(nextPalette));
        }
      } catch (error) {
        console.warn("Failed to load theme palette", error);
      } finally {
        if (active) {
          setIsPaletteReady(true);
        }
      }
    };

    loadThemePalette();
    return () => {
      active = false;
    };
  }, []);

  const setPalette = async (nextPalette: ThemePalette) => {
    const normalizedPalette = normalizeThemePalette(nextPalette);
    if (!isValidThemePalette(normalizedPalette)) {
      throw new Error("Invalid theme palette");
    }

    setPaletteState(normalizedPalette);
    await SecureStore.setItemAsync(THEME_PALETTE_STORAGE_KEY, JSON.stringify(normalizedPalette));
  };

  const resetPalette = async () => {
    setPaletteState(DEFAULT_THEME_PALETTE);
    await SecureStore.deleteItemAsync(THEME_PALETTE_STORAGE_KEY);
  };

  const value = useMemo<ColorThemeContextValue>(
    () => ({
      palette,
      colors: createSemanticColors(palette),
      isPaletteReady,
      setPalette,
      resetPalette,
    }),
    [isPaletteReady, palette],
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
