import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { Domain } from "@/lib/transactions-types";
import { addLocalAccount, deleteLocalAccount, getLocalAccounts } from "@/lib/accounts-db";

export interface Account {
  _id: string;
  userId: string;
  title: string;
  currency: string;
  accountNumber?: string;
  domainIds: Domain[];
}

type UpsertAccountPayload = {
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
      queryFn: async () => {
        try {
          const data = await getLocalAccounts();
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      providesTags: ["Account"],
    }),
    addAccount: builder.mutation<Account, UpsertAccountPayload>({
      queryFn: async (payload) => {
        try {
          if (!payload.title?.trim()) {
            return { error: { status: 400, data: { message: "Title is required" } } as never };
          }
          const domainNames = Array.isArray(payload.domainNames) ? payload.domainNames : [];
          if (!domainNames.length) {
            return { error: { status: 400, data: { message: "At least one sender domain/email is required" } } as never };
          }
          const data = await addLocalAccount(payload);
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Account"],
    }),
    deleteAccount: builder.mutation<{ message: string }, string>({
      queryFn: async (clientAccountId) => {
        try {
          await deleteLocalAccount(clientAccountId);
          return { data: { message: "Account deleted successfully" } };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Account"],
    }),
  }),
});

export const { useGetAccountsQuery, useAddAccountMutation, useDeleteAccountMutation } = accountsApi;
