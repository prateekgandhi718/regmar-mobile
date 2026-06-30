import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const investmentsApi = createApi({
  reducerPath: "investmentsApi",
  baseQuery,
  endpoints: () => ({}),
});
