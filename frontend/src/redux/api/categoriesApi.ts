import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export interface Category {
  _id: string;
  name: string;
}

export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
  baseQuery,
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => "/master/categories",
    }),
  }),
});

export const { useGetCategoriesQuery } = categoriesApi;
