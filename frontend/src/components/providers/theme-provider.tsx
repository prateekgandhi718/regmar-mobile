import { createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

type ThemeContextValue = {
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { setColorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    setColorScheme("dark");
  }, [setColorScheme]);

  const value = useMemo(
    () => ({
      isDark: true,
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
