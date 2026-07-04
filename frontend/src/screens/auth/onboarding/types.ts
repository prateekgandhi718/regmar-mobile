import type { Animated } from "react-native";

export type OnboardingStep =
  | "intro"
  | "needs"
  | "insights"
  | "privacy"
  | "logoMorph"
  | "setupHi"
  | "setupName"
  | "setupEmailProvider"
  | "setupEmailCredentials"
  | "setupAccount";

export type BubbleNeed = {
  label: string;
  color: string;
  size: number;
};

export type NeedInsight = {
  label: string;
  score: number;
  color: string;
  width: number;
  radii: readonly [number, number, number, number];
};

export type StepTransitionStyle = {
  opacity: Animated.Value;
  translateX: Animated.Value;
};
