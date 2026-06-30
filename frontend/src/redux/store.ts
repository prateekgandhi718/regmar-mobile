import { configureStore } from "@reduxjs/toolkit";
import { accountsApi } from "./api/accountsApi";
import { authApi } from "./api/authApi";
import { categoriesApi } from "./api/categoriesApi";
import { investmentsApi } from "./api/investmentsApi";
import { linkedAccountsApi } from "./api/linkedAccountsApi";
import { nerFeedbackApi } from "./api/nerFeedbackApi";
import { syncApi } from "./api/syncApi";
import { transactionsApi } from "./api/transactionsApi";
import { txnClassifierApi } from "./api/txnClassifierApi";
import authReducer from "./features/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [accountsApi.reducerPath]: accountsApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    [investmentsApi.reducerPath]: investmentsApi.reducer,
    [linkedAccountsApi.reducerPath]: linkedAccountsApi.reducer,
    [nerFeedbackApi.reducerPath]: nerFeedbackApi.reducer,
    [syncApi.reducerPath]: syncApi.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
    [txnClassifierApi.reducerPath]: txnClassifierApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      accountsApi.middleware,
      authApi.middleware,
      categoriesApi.middleware,
      investmentsApi.middleware,
      linkedAccountsApi.middleware,
      nerFeedbackApi.middleware,
      syncApi.middleware,
      transactionsApi.middleware,
      txnClassifierApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
