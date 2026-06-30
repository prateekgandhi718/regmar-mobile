import { ReactNode } from "react";
import { ReduxProvider } from "@/redux/provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <ReduxProvider>{children}</ReduxProvider>;
}
