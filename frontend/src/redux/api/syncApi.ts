import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const syncApi = createApi({
  reducerPath: "syncApi",
  baseQuery,
  endpoints: () => ({}),
});
