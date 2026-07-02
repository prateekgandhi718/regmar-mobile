import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { EntityData } from "@/lib/transactions-types";

type SaveNerFeedbackPayload = {
  clientTxnId: string;
  emailText: string;
  modelEntities: EntityData[];
  correctedEntities: EntityData[];
  nerModelVersion?: string;
};

export const nerFeedbackApi = createApi({
  reducerPath: "nerFeedbackApi",
  baseQuery,
  endpoints: (builder) => ({
    saveNerFeedback: builder.mutation<unknown, SaveNerFeedbackPayload>({
      query: (body) => ({
        url: "/ner-training/save-feedback",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useSaveNerFeedbackMutation } = nerFeedbackApi;
