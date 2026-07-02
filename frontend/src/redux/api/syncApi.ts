import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import { upsertTransactions } from "@/lib/transactions-db";
import type { Transaction } from "@/lib/transactions-types";
import { transactionsApi } from "./transactionsApi";

type SyncTransactionsResponse = {
  message: string;
  transactionsSynced: number;
  transactions: Transaction[];
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
  }),
});

export const { useSyncTransactionsMutation } = syncApi;
