import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export interface LinkedAccount {
  id: string;
  email: string;
  provider: string;
  isActive: boolean;
}

export type LinkedAccountProvider = "gmail" | "icloud";

type LinkEmailAccountResponse = {
  message: string;
  linkedAccount: LinkedAccount;
};

export const linkedAccountsApi = createApi({
  reducerPath: "linkedAccountsApi",
  baseQuery,
  tagTypes: ["LinkedAccount"],
  endpoints: (builder) => ({
    getLinkedAccounts: builder.query<LinkedAccount[], void>({
      query: () => "/linked-accounts",
      providesTags: ["LinkedAccount"],
    }),
    linkEmailAccount: builder.mutation<
      LinkEmailAccountResponse,
      { provider: LinkedAccountProvider; email: string; appPassword: string }
    >({
      query: ({ provider, ...body }) => ({
        url: `/linked-accounts/${provider}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["LinkedAccount"],
    }),
    unlinkAccount: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/linked-accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LinkedAccount"],
    }),
  }),
});

export const { useGetLinkedAccountsQuery, useLinkEmailAccountMutation, useUnlinkAccountMutation } = linkedAccountsApi;
