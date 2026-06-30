import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { API_BASE_URL } from "@/lib/api";
import { clearAuthTokens, getRefreshToken, saveAuthTokens } from "@/lib/auth-storage";
import { logout, setSession } from "@/redux/features/authSlice";
import type { RootState } from "@/redux/store";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const accessToken = state.auth.accessToken;

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    return headers;
  },
});

const isRefreshRequest = (args: string | FetchArgs) => {
  if (typeof args === "string") {
    return args.includes("/auth/refresh-token");
  }

  return String(args.url).includes("/auth/refresh-token");
};

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401 || isRefreshRequest(args)) {
    return result;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearAuthTokens();
    api.dispatch(logout());
    return result;
  }

  const refreshResult = await rawBaseQuery(
    {
      url: "/auth/refresh-token",
      method: "POST",
      body: { refreshToken },
    },
    api,
    extraOptions,
  );

  const refreshData = refreshResult.data as { accessToken?: string; refreshToken?: string } | undefined;

  if (refreshData?.accessToken && refreshData.refreshToken) {
    await saveAuthTokens(refreshData.accessToken, refreshData.refreshToken);
    api.dispatch(setSession({ accessToken: refreshData.accessToken, refreshToken: refreshData.refreshToken }));
    result = await rawBaseQuery(args, api, extraOptions);
  } else {
    await clearAuthTokens();
    api.dispatch(logout());
  }

  return result;
};
