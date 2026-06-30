import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  const [theme, setThemeState] = useState<Theme>("system");
  const resolvedTheme: "light" | "dark" = colorScheme === "dark" ? "dark" : "light";

  const value = useMemo(
    () => ({
      theme,
      isDark: resolvedTheme === "dark",
      setTheme: (nextTheme: Theme) => {
        setThemeState(nextTheme);
        setColorScheme(nextTheme);
      },
      toggleTheme: () => {
        const next = resolvedTheme === "dark" ? "light" : "dark";
        setThemeState(next);
        setColorScheme(next);
      },
    }),
    [theme, resolvedTheme, setColorScheme],
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
