import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AppProviders } from "@/components/providers/AppProviders";
import { useTheme } from "@/components/providers/theme-provider";
import { API_BASE_URL } from "@/lib/api";
import { getAccessToken, getOrCreateDeviceUuid, getRefreshToken, getStoredName, saveAuthTokens } from "@/lib/auth-storage";
import { initTransactionsDb } from "@/lib/transactions-db";
import { AppNavigator } from "@/navigation/AppNavigator";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setBootstrapped, setSession } from "@/redux/features/authSlice";

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const isBootstrapped = useAppSelector((state) => state.auth.isBootstrapped);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await initTransactionsDb();
        const deviceUuid = await getOrCreateDeviceUuid();
        const [accessToken, refreshToken, name] = await Promise.all([getAccessToken(), getRefreshToken(), getStoredName()]);

        if (accessToken && refreshToken) {
          if (!active) return;
          dispatch(setSession({ accessToken, refreshToken }));
          return;
        }

        if (!name?.trim()) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/device/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceUuid, name }),
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
        if (!data.accessToken || !data.refreshToken || !active) {
          return;
        }

        await saveAuthTokens(data.accessToken, data.refreshToken);
        dispatch(setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }));
      } catch (error) {
        console.error("Failed to bootstrap auth:", error);
      } finally {
        if (active) {
          dispatch(setBootstrapped(true));
        }
      }
    };

    if (!isBootstrapped) {
      bootstrap();
    }

    return () => {
      active = false;
    };
  }, [dispatch, isBootstrapped]);

  if (!isBootstrapped) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AppNavigator />;
}

export function AppRoot() {
  return (
    <AppProviders>
      <AppStatusBar />
      <AuthBootstrap />
    </AppProviders>
  );
}
