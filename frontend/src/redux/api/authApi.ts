import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name?: string;
    pan?: string;
    primaryColor?: string;
  };
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery,
  endpoints: (builder) => ({
    registerDevice: builder.mutation<AuthResponse, { deviceUuid: string; name: string }>({
      query: (body) => ({
        url: "/auth/device/register",
        method: "POST",
        body,
      }),
    }),
    refreshToken: builder.mutation<{ accessToken: string; refreshToken: string }, { refreshToken: string }>({
      query: (body) => ({
        url: "/auth/refresh-token",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useRegisterDeviceMutation, useRefreshTokenMutation } = authApi;
