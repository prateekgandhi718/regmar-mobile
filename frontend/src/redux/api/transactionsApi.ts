import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const transactionsApi = createApi({
  reducerPath: "transactionsApi",
  baseQuery,
  endpoints: () => ({}),
});
