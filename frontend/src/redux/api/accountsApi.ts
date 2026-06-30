import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const accountsApi = createApi({
  reducerPath: "accountsApi",
  baseQuery,
  endpoints: () => ({}),
});
