import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
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
      query: (filter) => ({ url: "/transactions", params: filter || undefined }),
      transformResponse: (response: any[]) => response.map((tx) => ({
        ...tx,
        clientTxnId: tx.clientTxnId || tx._id,
        accountId: tx.accountId,
        domainId: tx.domainId,
        originalDate: tx.originalDate,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        emailBody: tx.emailBody || "",
      })),
      providesTags: ["Transaction"],
    }),
    createTransaction: builder.mutation<Transaction, CreateTransactionPayload>({ query: (body) => ({ url: "/transactions", method: "POST", body }),
      invalidatesTags: ["Transaction"],
    }),
    updateTransaction: builder.mutation<Transaction, UpdateTransactionPayload>({
      query: ({ clientTxnId, ...body }) => ({ url: `/transactions/${clientTxnId}`, method: "PATCH", body }),
      invalidatesTags: ["Transaction"],
    }),
    deleteTransaction: builder.mutation<{ message: string }, string>({
      query: (clientTxnId) => ({ url: `/transactions/${clientTxnId}`, method: "DELETE" }),
      invalidatesTags: ["Transaction"],
    }),
    clearTransactions: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/transactions", method: "DELETE" }),
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
