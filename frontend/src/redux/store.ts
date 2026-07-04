import { configureStore } from "@reduxjs/toolkit";
import { accountsApi } from "./api/accountsApi";
import { authApi } from "./api/authApi";
import { investmentsApi } from "./api/investmentsApi";
import { linkedAccountsApi } from "./api/linkedAccountsApi";
import { needsApi } from "./api/needsApi";
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
    [investmentsApi.reducerPath]: investmentsApi.reducer,
    [linkedAccountsApi.reducerPath]: linkedAccountsApi.reducer,
    [needsApi.reducerPath]: needsApi.reducer,
    [nerFeedbackApi.reducerPath]: nerFeedbackApi.reducer,
    [syncApi.reducerPath]: syncApi.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
    [txnClassifierApi.reducerPath]: txnClassifierApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      accountsApi.middleware,
      authApi.middleware,
      investmentsApi.middleware,
      linkedAccountsApi.middleware,
      needsApi.middleware,
      nerFeedbackApi.middleware,
      syncApi.middleware,
      transactionsApi.middleware,
      txnClassifierApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
