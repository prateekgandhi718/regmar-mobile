import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  hasCompletedOnboarding: boolean;
  isBootstrapped: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  hasCompletedOnboarding: false,
  isBootstrapped: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; onboardingComplete?: boolean }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      if (typeof action.payload.onboardingComplete === "boolean") {
        state.hasCompletedOnboarding = action.payload.onboardingComplete;
      }
      state.isAuthenticated = true;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedOnboarding = action.payload;
    },
    setBootstrapped: (state, action: PayloadAction<boolean>) => {
      state.isBootstrapped = action.payload;
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.hasCompletedOnboarding = false;
      state.isBootstrapped = true;
    },
  },
});

export const { setSession, setOnboardingComplete, setBootstrapped, logout } = authSlice.actions;
export default authSlice.reducer;
