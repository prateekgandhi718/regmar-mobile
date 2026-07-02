import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import {
  deleteTransactionLocal,
  getTransactions,
  updateTransactionLocal,
} from "@/lib/transactions-db";
import type { Transaction, TransactionCategory, TransactionFilter } from "@/lib/transactions-types";

type UpdateTransactionPayload = {
  clientTxnId: string;
  newDate?: string | null;
  newDescription?: string | null;
  newAmount?: number | null;
  refunded?: boolean;
  userType?: "credit" | "debit" | null;
  categoryId?: TransactionCategory | null;
};

export const transactionsApi = createApi({
  reducerPath: "transactionsApi",
  baseQuery,
  tagTypes: ["Transaction"],
  endpoints: (builder) => ({
    getTransactions: builder.query<Transaction[], TransactionFilter | void>({
      queryFn: async (filter) => {
        try {
          const data = await getTransactions(filter || undefined);
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      providesTags: ["Transaction"],
    }),
    updateTransaction: builder.mutation<Transaction, UpdateTransactionPayload>({
      queryFn: async ({ clientTxnId, ...patch }) => {
        try {
          const updated = await updateTransactionLocal(clientTxnId, patch);
          if (!updated) {
            return { error: { status: 404, data: { message: "Transaction not found" } } as never };
          }
          return { data: updated };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Transaction"],
    }),
    deleteTransaction: builder.mutation<{ message: string }, string>({
      queryFn: async (clientTxnId) => {
        try {
          await deleteTransactionLocal(clientTxnId);
          return { data: { message: "Transaction deleted successfully" } };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Transaction"],
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi;
