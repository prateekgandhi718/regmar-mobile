import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import { buildSyncAccountsPayload, getSyncStateMap, upsertSyncStateUpdates } from "@/lib/accounts-db";
import { clearStoredInvestment, getStoredInvestment, getStoredInvestmentPan, saveInvestment } from "@/lib/investments-storage";
import type { InvestmentData } from "@/lib/investments-types";
import { upsertTransactions } from "@/lib/transactions-db";
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
          const [accounts, syncState] = await Promise.all([
            buildSyncAccountsPayload(),
            getSyncStateMap(),
          ]);

          if (!accounts.length) {
            return {
              error: {
                status: 400,
                data: { message: "No bank accounts with transaction domains found. Please add an account first." },
              } as never,
            };
          }

          const response = await baseQueryFn({
            url: "/sync",
            method: "POST",
            body: { accounts, syncState },
          });

          if (response.error) {
            return { error: response.error as never };
          }

          const data = response.data as SyncTransactionsResponse;
          await upsertTransactions(data.transactions || []);
          await upsertSyncStateUpdates(data.syncStateUpdates || {});
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
          const [pan, currentInvestment] = await Promise.all([
            getStoredInvestmentPan(),
            getStoredInvestment(),
          ]);

          if (!pan) {
            return { error: { status: 400, data: { message: "Please save your PAN first." } } as never };
          }

          const body: { pan: string; lastSyncedEmailUid?: number } = { pan };
          if (currentInvestment?.lastSyncedEmailUid) {
            body.lastSyncedEmailUid = currentInvestment.lastSyncedEmailUid;
          }

          const response = await baseQueryFn({
            url: "/sync/investments",
            method: "POST",
            body,
          });

          if (response.error) {
            return { error: response.error as never };
          }

          const data = response.data as SyncInvestmentsResponse;
          if (data.investment) {
            await saveInvestment(data.investment);
          } else if (!data.alreadySynced) {
            await clearStoredInvestment();
          }

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
