import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapped: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  isBootstrapped: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    setBootstrapped: (state, action: PayloadAction<boolean>) => {
      state.isBootstrapped = action.payload;
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isBootstrapped = true;
    },
  },
});

export const { setSession, setBootstrapped, logout } = authSlice.actions;
export default authSlice.reducer;
