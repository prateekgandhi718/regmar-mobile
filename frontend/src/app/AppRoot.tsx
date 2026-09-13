import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AppProviders } from "@/components/providers/AppProviders";
import { API_BASE_URL } from "@/lib/api";
import {
  clearAuthTokens,
  getAccessToken,
  getOnboardingCompleted,
  getOrCreateDeviceUuid,
  getRefreshToken,
  getStoredName,
  saveAuthTokens,
} from "@/lib/auth-storage";
import { AppNavigator } from "@/navigation/AppNavigator";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setBootstrapped, setSession } from "@/redux/features/authSlice";
import { configureGlobalTypography } from "@/theme/typography";

configureGlobalTypography();

function AppStatusBar() {
  return <StatusBar style="light" />;
}

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const isBootstrapped = useAppSelector((state) => state.auth.isBootstrapped);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const deviceUuid = await getOrCreateDeviceUuid();
        const [accessToken, refreshToken, name, onboardingCompleted] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
          getStoredName(),
          getOnboardingCompleted(),
        ]);

        if (accessToken && refreshToken) {
          // Always validate/rotate the persisted session before mounting the
          // authenticated navigator. Access tokens are intentionally short-lived
          // (15 minutes), so restoring one directly causes a 401 on every cold
          // start after that period.
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshed = (await refreshResponse.json()) as {
                accessToken?: string;
                refreshToken?: string;
              };

              if (refreshed.accessToken && refreshed.refreshToken && active) {
                await saveAuthTokens(refreshed.accessToken, refreshed.refreshToken);
                dispatch(
                  setSession({
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken,
                    onboardingComplete: onboardingCompleted ?? true,
                  }),
                );
                return;
              }
            }

            // A 401/403 means the refresh session is genuinely invalid. The
            // device identity below can issue a new session without onboarding.
            await clearAuthTokens();
          } catch {
            // Keep the existing session on a transient network failure. The
            // normal API retry path can refresh it once the server is reachable.
            if (!active) return;
            dispatch(setSession({ accessToken, refreshToken, onboardingComplete: onboardingCompleted ?? true }));
            return;
          }
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
        dispatch(
          setSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            onboardingComplete: onboardingCompleted ?? true,
          }),
        );
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
      <View className="flex-1 items-center justify-center bg-zinc-950">
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
