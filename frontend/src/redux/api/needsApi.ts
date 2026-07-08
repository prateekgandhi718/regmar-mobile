import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";

export type NeedMaster = {
  _id: string;
  key: "protection" | "fuel" | "connection" | "freedom";
  label: string;
  lineA: string;
  lineB: string;
  layers: [string, string, string];
  words: string[];
  withOptions: string[];
  whereOptions: string[];
  sortOrder: number;
};

export const needsApi = createApi({
  reducerPath: "needsApi",
  baseQuery,
  endpoints: (builder) => ({
    getNeeds: builder.query<NeedMaster[], void>({
      query: () => "/master/needs",
    }),
  }),
});

export const { useGetNeedsQuery } = needsApi;
