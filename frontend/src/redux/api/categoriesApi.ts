import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
  baseQuery,
  endpoints: () => ({}),
});
