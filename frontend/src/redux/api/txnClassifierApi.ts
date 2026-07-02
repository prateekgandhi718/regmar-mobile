import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

type SaveTxnClassifierFeedbackPayload = {
  clientTxnId?: string;
  emailText: string;
  sourceDomain?: string;
  isTransaction: boolean;
  txnType?: "credit" | "debit";
  modelConfidence?: number;
  typeConfidence?: number;
  classifierModelVersion?: string;
  typeModelVersion?: string;
};

export const txnClassifierApi = createApi({
  reducerPath: "txnClassifierApi",
  baseQuery,
  endpoints: (builder) => ({
    saveTxnClassifierFeedback: builder.mutation<unknown, SaveTxnClassifierFeedbackPayload>({
      query: (body) => ({
        url: "/txn-classifier/feedback",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useSaveTxnClassifierFeedbackMutation } = txnClassifierApi;
