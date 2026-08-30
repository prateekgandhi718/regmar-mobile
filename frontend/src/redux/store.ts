import { configureStore } from "@reduxjs/toolkit";
import { accountsApi } from "./api/accountsApi";
import { authApi } from "./api/authApi";
import { categoriesApi } from "./api/categoriesApi";
import { investmentsApi } from "./api/investmentsApi";
import { linkedAccountsApi } from "./api/linkedAccountsApi";
import { needsApi } from "./api/needsApi";
import { syncApi } from "./api/syncApi";
import { transactionsApi } from "./api/transactionsApi";
import authReducer from "./features/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [accountsApi.reducerPath]: accountsApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    [investmentsApi.reducerPath]: investmentsApi.reducer,
    [linkedAccountsApi.reducerPath]: linkedAccountsApi.reducer,
    [needsApi.reducerPath]: needsApi.reducer,
    [syncApi.reducerPath]: syncApi.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      accountsApi.middleware,
      authApi.middleware,
      categoriesApi.middleware,
      investmentsApi.middleware,
      linkedAccountsApi.middleware,
      needsApi.middleware,
      syncApi.middleware,
      transactionsApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
