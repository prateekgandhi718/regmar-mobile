import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
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
      query: () => ({
        url: "/sync",
        method: "POST",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await upsertTransactions(data.transactions || []);
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
