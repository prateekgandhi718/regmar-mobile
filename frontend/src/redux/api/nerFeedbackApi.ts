import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export const nerFeedbackApi = createApi({
  reducerPath: "nerFeedbackApi",
  baseQuery,
  endpoints: () => ({}),
});
