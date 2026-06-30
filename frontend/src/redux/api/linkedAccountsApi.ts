import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const linkedAccountsApi = createApi({
  reducerPath: "linkedAccountsApi",
  baseQuery,
  endpoints: () => ({}),
});
