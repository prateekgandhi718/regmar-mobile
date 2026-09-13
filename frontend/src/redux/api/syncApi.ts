import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { InvestmentData } from "@/lib/investments-types";
import type { Transaction } from "@/lib/transactions-types";
import { investmentsApi } from "./investmentsApi";
import { transactionsApi } from "./transactionsApi";

type SyncTransactionsResponse = {
  message: string;
  transactionsSynced: number;
  transactions: Transaction[];
  syncStateUpdates: Record<string, number>;
};

type SyncInvestmentsResponse = {
  message: string;
  investment?: InvestmentData;
  alreadySynced?: boolean;
};

export const syncApi = createApi({
  reducerPath: "syncApi",
  baseQuery,
  endpoints: (builder) => ({
    syncTransactions: builder.mutation<SyncTransactionsResponse, void>({
      queryFn: async (_arg, _api, _extraOptions, baseQueryFn) => {
        try {
          const accountsResponse = await baseQueryFn({ url: "/accounts" });
          if (accountsResponse.error) return { error: accountsResponse.error as never };
          const accounts = (accountsResponse.data as any[]).map(account => ({ ...account, clientAccountId: account._id, domains: (account.domainIds || []).map((domain: any) => ({ clientDomainId: domain._id, fromEmail: domain.fromEmail })) }));

          const response = await baseQueryFn({
            url: "/sync",
            method: "POST",
            body: { accounts },
          });

          if (response.error) {
            return { error: response.error as never };
          }

          const data = response.data as SyncTransactionsResponse;
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(transactionsApi.util.invalidateTags(["Transaction"]));
        } catch {}
      },
    }),
    syncInvestments: builder.mutation<SyncInvestmentsResponse, void>({
      queryFn: async (_arg, api, extraOptions, baseQueryFn) => {
        try {
          const profileResponse = await baseQueryFn({ url: "/users/me" });
          const pan = (profileResponse.data as { pan?: string } | undefined)?.pan;

          if (!pan) {
            return { error: { status: 400, data: { message: "Please save your PAN first." } } as never };
          }

          const body: { pan: string } = { pan };

          const response = await baseQueryFn({
            url: "/sync/investments",
            method: "POST",
            body,
          });

          if (response.error) {
            return { error: response.error as never };
          }

          const data = response.data as SyncInvestmentsResponse;
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(investmentsApi.util.invalidateTags(["Investment"]));
        } catch {}
      },
    }),
  }),
});

export const { useSyncTransactionsMutation, useSyncInvestmentsMutation } = syncApi;
