import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { InvestmentData } from "@/lib/investments-types";
import { getStoredInvestment, getStoredInvestmentPan, saveInvestmentPan } from "@/lib/investments-storage";

type SaveInvestmentPanPayload = {
  pan: string;
};

export const investmentsApi = createApi({
  reducerPath: "investmentsApi",
  baseQuery,
  tagTypes: ["Investment", "InvestmentPan"],
  endpoints: (builder) => ({
    getMyInvestments: builder.query<InvestmentData | null, void>({
      queryFn: async () => {
        try {
          const data = await getStoredInvestment();
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      providesTags: ["Investment"],
    }),
    getInvestmentPan: builder.query<string | null, void>({
      queryFn: async () => {
        try {
          const data = await getStoredInvestmentPan();
          return { data };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: (error as Error).message } as never };
        }
      },
      providesTags: ["InvestmentPan"],
    }),
    saveInvestmentPan: builder.mutation<string, SaveInvestmentPanPayload>({
      queryFn: async ({ pan }) => {
        try {
          const savedPan = await saveInvestmentPan(pan);
          return { data: savedPan };
        } catch (error) {
          return { error: { status: 400, data: { message: (error as Error).message } } as never };
        }
      },
      invalidatesTags: ["InvestmentPan"],
    }),
  }),
});

export const {
  useGetMyInvestmentsQuery,
  useGetInvestmentPanQuery,
  useSaveInvestmentPanMutation,
} = investmentsApi;
