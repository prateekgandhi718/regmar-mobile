import { ReactNode } from "react";
import { ReduxProvider } from "@/redux/provider";
import { ThemeProvider } from "./theme-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ReduxProvider>{children}</ReduxProvider>
    </ThemeProvider>
  );
}
