import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import type { TransactionCategory } from "@/lib/transactions-types";

export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
  baseQuery,
  endpoints: (builder) => ({
    getCategories: builder.query<TransactionCategory[], void>({
      query: () => "/master/categories",
    }),
  }),
});

export const { useGetCategoriesQuery } = categoriesApi;
