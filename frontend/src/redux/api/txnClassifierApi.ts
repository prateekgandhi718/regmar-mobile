import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const txnClassifierApi = createApi({
  reducerPath: "txnClassifierApi",
  baseQuery,
  endpoints: () => ({}),
});
