import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { Domain } from "@/lib/transactions-types";

export interface Account {
  _id: string;
  userId: string;
  title: string;
  currency: string;
  accountNumber?: string;
  domainIds: Domain[];
}

type UpsertAccountPayload = {
  clientAccountId?: string;
  title: string;
  currency: string;
  domainNames: string[];
  accountNumber?: string;
  icon?: string;
};

export const accountsApi = createApi({
  reducerPath: "accountsApi",
  baseQuery,
  tagTypes: ["Account"],
  endpoints: (builder) => ({
    getAccounts: builder.query<Account[], void>({
      query: () => "/accounts",
      providesTags: ["Account"],
    }),
    addAccount: builder.mutation<Account, UpsertAccountPayload>({
      query: (body) => ({ url: "/accounts", method: "POST", body }),
      invalidatesTags: ["Account"],
    }),
    updateAccount: builder.mutation<Account, UpsertAccountPayload>({
      query: ({ clientAccountId, ...body }) => ({ url: `/accounts/${clientAccountId}`, method: "PATCH", body }),
      invalidatesTags: ["Account"],
    }),
    deleteAccount: builder.mutation<{ message: string }, string>({
      query: (clientAccountId) => ({ url: `/accounts/${clientAccountId}`, method: "DELETE" }),
      invalidatesTags: ["Account"],
    }),
  }),
});

export const { useGetAccountsQuery, useAddAccountMutation, useUpdateAccountMutation, useDeleteAccountMutation } = accountsApi;
