import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { Domain } from "@/lib/transactions-types";
import { addLocalAccount, deleteLocalAccount, getLocalAccounts, updateLocalAccount } from "@/lib/accounts-db";

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
          const data = await addLocalAccount(payload);
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Account"],
    }),
    updateAccount: builder.mutation<Account, UpsertAccountPayload>({
      queryFn: async (payload) => {
        try {
          if (!payload.clientAccountId) {
            return { error: { status: 400, data: { message: "Account id is required" } } as never };
          }
          if (!payload.title?.trim()) {
            return { error: { status: 400, data: { message: "Title is required" } } as never };
          }
          const domainNames = Array.isArray(payload.domainNames) ? payload.domainNames : [];
          const data = await updateLocalAccount({
            clientAccountId: payload.clientAccountId,
            title: payload.title,
            currency: payload.currency,
            domainNames,
            accountNumber: payload.accountNumber,
          });
          if (!data) {
            return { error: { status: 404, data: { message: "Account not found" } } as never };
          }
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

export const { useGetAccountsQuery, useAddAccountMutation, useUpdateAccountMutation, useDeleteAccountMutation } = accountsApi;
