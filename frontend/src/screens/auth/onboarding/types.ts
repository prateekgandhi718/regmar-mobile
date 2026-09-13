import type { Animated } from "react-native";

export type OnboardingStep =
  | "setupHi"
  | "setupName"
  | "setupEmailProvider"
  | "setupEmailCredentials"
  | "setupAccount";

export type StepTransitionStyle = {
  opacity: Animated.Value;
  translateX: Animated.Value;
};
