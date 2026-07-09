import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import {
  clearAllTransactionsLocal,
  createTransactionLocal,
  deleteTransactionLocal,
  getTransactions,
  updateTransactionLocal,
} from "@/lib/transactions-db";
import type { NeedSelection, Transaction, TransactionCategory, TransactionFilter } from "@/lib/transactions-types";

type UpdateTransactionPayload = {
  clientTxnId: string;
  newDate?: string | null;
  newDescription?: string | null;
  newAmount?: number | null;
  refunded?: boolean;
  userType?: "credit" | "debit" | null;
  categoryId?: TransactionCategory | null;
  accountId?: string;
  accountMeta?: {
    _id: string;
    userId: string;
    title: string;
    currency: string;
    accountNumber?: string;
    fromEmail?: string;
  };
  needSelection?: NeedSelection | null;
};

type CreateTransactionPayload = {
  clientTxnId: string;
  description: string;
  amount: number;
  date: string;
  userType: "credit" | "debit";
  accountId?: string;
  accountMeta?: {
    _id: string;
    userId: string;
    title: string;
    currency: string;
    accountNumber?: string;
    fromEmail?: string;
  };
  refunded?: boolean;
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
    createTransaction: builder.mutation<Transaction, CreateTransactionPayload>({
      queryFn: async (payload) => {
        try {
          const created = await createTransactionLocal(payload);
          if (!created) {
            return { error: { status: "CUSTOM_ERROR", error: "Could not create transaction" } as never };
          }
          return { data: created };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Transaction"],
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
    clearTransactions: builder.mutation<{ message: string }, void>({
      queryFn: async () => {
        try {
          await clearAllTransactionsLocal();
          return { data: { message: "Transactions cleared successfully" } };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      invalidatesTags: ["Transaction"],
    }),
  }),
});

export const {
  useClearTransactionsMutation,
  useCreateTransactionMutation,
  useGetTransactionsQuery,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi;
