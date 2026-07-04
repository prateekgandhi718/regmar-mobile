import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { getOrCreateDeviceUuid, saveAuthTokens, setStoredName } from "@/lib/auth-storage";
import { useRegisterDeviceMutation } from "@/redux/api/authApi";
import { setSession } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { InsightsStep } from "./onboarding/steps/InsightsStep";
import { IntroStep } from "./onboarding/steps/IntroStep";
import { LogoMorphStep } from "./onboarding/steps/LogoMorphStep";
import { NeedsStep } from "./onboarding/steps/NeedsStep";
import { PrivacyStep } from "./onboarding/steps/PrivacyStep";
import { SetupHiStep } from "./onboarding/steps/SetupHiStep";
import { SetupNameStep } from "./onboarding/steps/SetupNameStep";
import { SetupPlaceholderStep } from "./onboarding/steps/SetupPlaceholderStep";
import type { BubbleNeed, NeedInsight, OnboardingStep } from "./onboarding/types";

const NEED_BUBBLES: BubbleNeed[] = [
  { label: "Connection", color: "#A0A86A", size: 200 },
  { label: "Comfort", color: "#4D7EA8", size: 138 },
  { label: "Freedom", color: "#3D9369", size: 128 },
  { label: "Security", color: "#9A7740", size: 148 },
  { label: "Joy", color: "#A24A3D", size: 116 },
  { label: "Growth", color: "#7D8F40", size: 136 },
  { label: "Belonging", color: "#5A8C9C", size: 154 },
  { label: "Peace", color: "#4E956F", size: 126 },
  { label: "Curiosity", color: "#A9873D", size: 132 },
  { label: "Rest", color: "#48789C", size: 124 },
  { label: "Play", color: "#338B66", size: 120 },
  { label: "Purpose", color: "#8B6E3B", size: 146 },
  { label: "Care", color: "#8A433A", size: 118 },
  { label: "Focus", color: "#87A049", size: 100 },
];

const NEED_INSIGHTS: NeedInsight[] = [
  { label: "Connection", score: 4, color: "#F8C843", width: 250, radii: [4, 0, 0, 20] },
  { label: "Freedom", score: 3, color: "#F8C843", width: 210, radii: [20, 4, 20, 0] },
  { label: "Peace", score: 4, color: "#4ADEA7", width: 250, radii: [0, 16, 16, 0] },
  { label: "Belonging", score: 3, color: "#4ADEA7", width: 210, radii: [16, 0, 0, 16] },
  { label: "Joy", score: 4, color: "#FF544A", width: 250, radii: [0, 20, 0, 20] },
  { label: "Comfort", score: 3, color: "#FF544A", width: 210, radii: [20, 0, 20, 0] },
  { label: "Security", score: 4, color: "#6E97FF", width: 250, radii: [10, 2, 2, 10] },
  { label: "Purpose", score: 4, color: "#6E97FF", width: 250, radii: [2, 10, 10, 2] },
];

export function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useColorTheme();
  const [step, setStep] = useState<OnboardingStep>("intro");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registerDevice, { isLoading }] = useRegisterDeviceMutation();

  const transitionX = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

  const needsProgress = useRef(NEED_INSIGHTS.map(() => new Animated.Value(0))).current;
  const insightCopyOpacity = useRef(new Animated.Value(0)).current;
  const insightCopyTranslateY = useRef(new Animated.Value(32)).current;

  const morphLogoOpacity = useRef(new Animated.Value(0)).current;
  const morphLogoScale = useRef(new Animated.Value(0.54)).current;
  const morphCircleScale = useRef(new Animated.Value(1.8)).current;
  const morphCircleOpacity = useRef(new Animated.Value(1)).current;

  const animateIntoStep = (next: OnboardingStep) => {
    setStep(next);
    transitionX.setValue(46);
    transitionOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(transitionX, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(transitionOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const transitionToStep = (next: OnboardingStep) => {
    if (next === step || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    Animated.parallel([
      Animated.timing(transitionX, {
        toValue: -38,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(transitionOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      animateIntoStep(next);
      isTransitioningRef.current = false;
    });
  };

  useEffect(() => {
    if (step !== "insights") return;
    needsProgress.forEach((progress) => progress.setValue(0));
    insightCopyOpacity.setValue(0);
    insightCopyTranslateY.setValue(32);

    Animated.sequence([
      Animated.delay(900),
      Animated.stagger(
        85,
        needsProgress.map((progress) =>
          Animated.timing(progress, {
            toValue: 1,
            duration: 540,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ),
      ),
      Animated.parallel([
        Animated.timing(insightCopyOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(insightCopyTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [insightCopyOpacity, insightCopyTranslateY, needsProgress, step]);

  useEffect(() => {
    if (step !== "logoMorph") return;
    morphLogoOpacity.setValue(0);
    morphLogoScale.setValue(0.54);
    morphCircleScale.setValue(1.8);
    morphCircleOpacity.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(morphCircleOpacity, {
          toValue: 0,
          duration: 980,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(morphCircleScale, {
          toValue: 0.2,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(morphLogoOpacity, {
          toValue: 1,
          duration: 960,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(morphLogoScale, {
          toValue: 1,
          duration: 960,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
    ]).start(() => {
      animateIntoStep("setupHi");
    });
  }, [morphCircleOpacity, morphCircleScale, morphLogoOpacity, morphLogoScale, step]);

  const handleFinishOnboarding = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      transitionToStep("setupName");
      return;
    }
    setError(null);

    try {
      const deviceUuid = await getOrCreateDeviceUuid();
      const response = await registerDevice({ deviceUuid, name: trimmedName }).unwrap();
      await Promise.all([
        setStoredName(trimmedName),
        saveAuthTokens(response.accessToken, response.refreshToken),
      ]);
      dispatch(setSession({ accessToken: response.accessToken, refreshToken: response.refreshToken }));
    } catch (requestError) {
      console.error("Device registration failed:", requestError);
      setError("Could not create your account. Please try again.");
      transitionToStep("setupName");
    }
  };

  const transition = { opacity: transitionOpacity, translateX: transitionX };

  if (step === "intro") {
    return <IntroStep transition={transition} onContinue={() => transitionToStep("needs")} />;
  }

  if (step === "needs") {
    return <NeedsStep transition={transition} bubbles={NEED_BUBBLES} onContinue={() => transitionToStep("insights")} />;
  }

  if (step === "insights") {
    return (
      <InsightsStep
        transition={transition}
        insights={NEED_INSIGHTS}
        progressValues={needsProgress}
        copyOpacity={insightCopyOpacity}
        copyTranslateY={insightCopyTranslateY}
        onContinue={() => transitionToStep("privacy")}
      />
    );
  }

  if (step === "privacy") {
    return <PrivacyStep transition={transition} onAccept={() => transitionToStep("logoMorph")} />;
  }

  if (step === "logoMorph") {
    return (
      <LogoMorphStep
        logoOpacity={morphLogoOpacity}
        logoScale={morphLogoScale}
        circleOpacity={morphCircleOpacity}
        circleScale={morphCircleScale}
      />
    );
  }

  if (step === "setupHi") {
    return (
      <SetupHiStep
        transition={transition}
        onBack={() => transitionToStep("privacy")}
        onContinue={() => transitionToStep("setupName")}
      />
    );
  }

  if (step === "setupName") {
    return (
      <SetupNameStep
        transition={transition}
        name={name}
        error={error}
        onNameChange={(value) => {
          setName(value);
          if (error) setError(null);
        }}
        onBack={() => transitionToStep("setupHi")}
        onContinue={() => {
          if (!name.trim()) {
            setError("Please enter your name.");
            return;
          }
          transitionToStep("setupEmail");
        }}
      />
    );
  }

  if (step === "setupEmail") {
    return (
      <SetupPlaceholderStep
        transition={transition}
        progress={3}
        title="Link your email"
        description="Setup step 2 placeholder. We will connect your email account using an app password here."
        ctaLabel="Continue"
        onBack={() => transitionToStep("setupName")}
        onContinue={() => transitionToStep("setupAccount")}
      />
    );
  }

  return (
    <SetupPlaceholderStep
      transition={transition}
      progress={4}
      title="Add an account"
      description="Setup step 3 placeholder. We will ask which account emails you want FIY to track."
      ctaLabel="Finish setup"
      onBack={() => transitionToStep("setupEmail")}
      onContinue={handleFinishOnboarding}
      isLoading={isLoading}
      ctaColor={colors.primary}
      ctaTextColor={colors.onTopOfPrimary}
    />
  );
}
