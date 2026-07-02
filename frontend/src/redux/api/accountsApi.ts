import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { Domain } from "@/lib/transactions-types";

export interface Account {
  _id: string;
  userId: string;
  title: string;
  currency: string;
  domainIds: Domain[];
}

type UpsertAccountPayload = {
  title: string;
  currency: string;
  domainNames: string[];
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
      query: (body) => ({
        url: "/accounts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Account"],
    }),
  }),
});

export const { useGetAccountsQuery, useAddAccountMutation } = accountsApi;
