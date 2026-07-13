import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, View } from "react-native";
import { getOrCreateDeviceUuid, saveAuthTokens, setOnboardingCompleted, setStoredName } from "@/lib/auth-storage";
import { useRegisterDeviceMutation } from "@/redux/api/authApi";
import {
  isLinkedAccountActive,
  LinkedAccountProvider,
  useGetLinkedAccountsQuery,
  useLinkEmailAccountMutation,
} from "@/redux/api/linkedAccountsApi";
import type { NeedMaster } from "@/redux/api/needsApi";
import { useGetNeedsQuery } from "@/redux/api/needsApi";
import { setOnboardingComplete, setSession } from "@/redux/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { InsightsStep } from "./onboarding/steps/InsightsStep";
import { IntroStep } from "./onboarding/steps/IntroStep";
import { LogoMorphStep } from "./onboarding/steps/LogoMorphStep";
import { NeedsStep } from "./onboarding/steps/NeedsStep";
import { PrivacyStep } from "./onboarding/steps/PrivacyStep";
import { SetupEmailCredentialsStep } from "./onboarding/steps/SetupEmailCredentialsStep";
import { SetupEmailProviderStep } from "./onboarding/steps/SetupEmailProviderStep";
import { SetupHiStep } from "./onboarding/steps/SetupHiStep";
import { SetupNameStep } from "./onboarding/steps/SetupNameStep";
import type { BubbleNeed, NeedInsight, OnboardingStep } from "./onboarding/types";

const NEED_BUBBLE_SIZES = [126, 98, 112, 104, 118, 108, 122, 102, 116, 96, 110, 120, 100, 114, 106, 124];
const MAX_NEED_BUBBLES = 36;

const ONBOARDING_NEEDS_FALLBACK: Pick<NeedMaster, "key" | "layers" | "sortOrder" | "words">[] = [
  {
    key: "protection",
    layers: ["#D84236", "#FF7A45", "#FF4F67"],
    sortOrder: 0,
    words: ["Shelter", "Security", "Emergency", "Stability", "Preparedness", "Assurance", "Care", "Reliability"],
  },
  {
    key: "fuel",
    layers: ["#D0AF45", "#ECD86A", "#FBC12F"],
    sortOrder: 1,
    words: ["Nourishment", "Energy", "Healing", "Recovery", "Hydration", "Strength", "Vitality", "Restoration"],
  },
  {
    key: "connection",
    layers: ["#6D86D4", "#89B7E9", "#789CF3"],
    sortOrder: 2,
    words: ["Belonging", "Status", "Kindness", "Recognition", "Love", "Friendship", "Celebration", "Support"],
  },
  {
    key: "freedom",
    layers: ["#46BC88", "#7EE2AB", "#5EDAAF"],
    sortOrder: 3,
    words: ["Time", "Organized", "Unwinding", "Calm", "Simplicity", "Choice", "Ease", "Autonomy"],
  },
];

const INSIGHT_CARD_STYLES: Array<{ score: number; width: number; radii: readonly [number, number, number, number] }> = [
  { score: 4, width: 250, radii: [4, 0, 0, 20] },
  { score: 3, width: 210, radii: [20, 4, 20, 0] },
  { score: 4, width: 250, radii: [0, 16, 16, 0] },
  { score: 3, width: 210, radii: [16, 0, 0, 16] },
  { score: 4, width: 250, radii: [0, 20, 0, 20] },
  { score: 3, width: 210, radii: [20, 0, 20, 0] },
  { score: 4, width: 250, radii: [10, 2, 2, 10] },
  { score: 4, width: 250, radii: [2, 10, 10, 2] },
];

const PREFERRED_INSIGHT_WORDS: Record<string, string[]> = {
  connection: ["Love", "Connection", "Belonging", "Support", "Friendship", "Kindness", "Celebration", "Recognition"],
  freedom: ["Calm", "Choice", "Ease", "Autonomy", "Time", "Simplicity"],
  protection: ["Security", "Stability", "Shelter", "Reliability", "Preparedness", "Care"],
  fuel: ["Energy", "Healing", "Nourishment", "Recovery", "Strength", "Vitality"],
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

export function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [step, setStep] = useState<OnboardingStep>("intro");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [emailProvider, setEmailProvider] = useState<LinkedAccountProvider>("gmail");
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [registerDevice, { isLoading: isRegisteringDevice }] = useRegisterDeviceMutation();
  const [linkEmailAccount, { isLoading: isLinkingEmail }] = useLinkEmailAccountMutation();
  const { data: needsFromApi = [] } = useGetNeedsQuery();

  const { data: linkedAccounts = [], isLoading: isLoadingLinkedAccounts } = useGetLinkedAccountsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const transitionX = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

  const needsProgress = useRef(INSIGHT_CARD_STYLES.map(() => new Animated.Value(0))).current;
  const insightCopyOpacity = useRef(new Animated.Value(0)).current;
  const insightCopyTranslateY = useRef(new Animated.Value(32)).current;

  const morphLogoOpacity = useRef(new Animated.Value(0)).current;
  const morphLogoScale = useRef(new Animated.Value(0.54)).current;
  const morphCircleScale = useRef(new Animated.Value(1.8)).current;
  const morphCircleOpacity = useRef(new Animated.Value(1)).current;

  const needsBubbles = useMemo<BubbleNeed[]>(() => {
    const source = needsFromApi.length ? needsFromApi : ONBOARDING_NEEDS_FALLBACK;
    const sortedNeeds = [...source].sort((a, b) => a.sortOrder - b.sortOrder);
    const uniqueWords = new Set<string>();
    const selectedWords = new Set<string>();
    const bubbles: BubbleNeed[] = [];

    for (const need of sortedNeeds) {
      const words = shuffle((need.words || []).map((word) => word.trim()).filter(Boolean));
      const firstAvailable = words.find((word) => !uniqueWords.has(word.toLowerCase()));
      if (!firstAvailable) continue;

      const normalized = firstAvailable.toLowerCase();
      uniqueWords.add(normalized);
      selectedWords.add(normalized);
      bubbles.push({
        label: firstAvailable,
        color: need.layers[2],
        size: NEED_BUBBLE_SIZES[bubbles.length % NEED_BUBBLE_SIZES.length],
      });
    }

    const remainingPool = shuffle(
      sortedNeeds.flatMap((need) =>
        (need.words || [])
          .map((word) => word.trim())
          .filter(Boolean)
          .map((word) => ({ word, color: need.layers[2] })),
      ),
    );

    for (const item of remainingPool) {
      if (bubbles.length >= MAX_NEED_BUBBLES) break;
      const normalized = item.word.toLowerCase();
      if (selectedWords.has(normalized)) continue;
      selectedWords.add(normalized);
      bubbles.push({
        label: item.word,
        color: item.color,
        size: NEED_BUBBLE_SIZES[bubbles.length % NEED_BUBBLE_SIZES.length],
      });
    }

    return bubbles.slice(0, MAX_NEED_BUBBLES);
  }, [needsFromApi]);

  const needInsights = useMemo<NeedInsight[]>(() => {
    const source = needsFromApi.length ? needsFromApi : ONBOARDING_NEEDS_FALLBACK;
    const sortedNeeds = [...source].sort((a, b) => a.sortOrder - b.sortOrder);
    const selected: Array<{ label: string; color: string }> = [];

    for (const need of sortedNeeds) {
      const words = (need.words || []).map((word) => word.trim()).filter(Boolean);
      if (!words.length) continue;
      const preferred = PREFERRED_INSIGHT_WORDS[need.key] || [];
      const picked: string[] = [];

      for (const preferredWord of preferred) {
        const match = words.find((word) => word.toLowerCase() === preferredWord.toLowerCase());
        if (match && !picked.some((word) => word.toLowerCase() === match.toLowerCase())) {
          picked.push(match);
        }
        if (picked.length === 2) break;
      }

      for (const word of words) {
        if (picked.length === 2) break;
        if (!picked.some((item) => item.toLowerCase() === word.toLowerCase())) {
          picked.push(word);
        }
      }

      for (const label of picked.slice(0, 2)) {
        selected.push({ label, color: need.layers[2] });
      }
    }

    return INSIGHT_CARD_STYLES.map((style, index) => {
      const fallback = selected[index % Math.max(selected.length, 1)] || { label: "Insight", color: "#6E97FF" };
      return {
        label: fallback.label,
        color: fallback.color,
        score: style.score,
        width: style.width,
        radii: style.radii,
      };
    });
  }, [needsFromApi]);

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

  const completeOnboarding = async () => {
    await setOnboardingCompleted(true);
    dispatch(setOnboardingComplete(true));
  };

  useEffect(() => {
    if (!isAuthenticated || isLoadingLinkedAccounts) return;

    const hasLinkedEmail = linkedAccounts.some((account) => isLinkedAccountActive(account.isActive));
    if (hasLinkedEmail && step !== "setupEmailProvider" && step !== "setupEmailCredentials") {
      void completeOnboarding();
      return;
    }

    if (!hasLinkedEmail && step !== "setupEmailProvider" && step !== "setupEmailCredentials") {
      animateIntoStep("setupEmailProvider");
    }
  }, [isAuthenticated, isLoadingLinkedAccounts, linkedAccounts, step]);

  const handleRegisterAndContinue = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Please enter your name.");
      return;
    }

    setNameError(null);

    try {
      const deviceUuid = await getOrCreateDeviceUuid();
      const response = await registerDevice({ deviceUuid, name: trimmedName }).unwrap();

      await Promise.all([
        setStoredName(trimmedName),
        saveAuthTokens(response.accessToken, response.refreshToken),
        setOnboardingCompleted(false),
      ]);

      dispatch(
        setSession({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          onboardingComplete: false,
        }),
      );

      animateIntoStep("setupEmailProvider");
    } catch (requestError) {
      console.error("Device registration failed:", requestError);
      setNameError("Could not create your account. Please try again.");
    }
  };

  const handleLinkEmailAndContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = appPassword.replace(/\s+/g, "");

    if (!normalizedEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (normalizedPassword.length !== 16) {
      setEmailError("App password must be exactly 16 characters.");
      return;
    }

    setEmailError(null);

    try {
      await linkEmailAccount({
        provider: emailProvider,
        email: normalizedEmail,
        appPassword: normalizedPassword,
      }).unwrap();
      await completeOnboarding();
    } catch (requestError) {
      const apiError = requestError as { data?: { message?: string } };
      setEmailError(apiError?.data?.message || "Unable to connect to your mailbox. Check your credentials.");
    }
  };

  const handleSkipEmailLinking = async () => {
    setEmailError(null);
    await completeOnboarding();
  };

  const transition = { opacity: transitionOpacity, translateX: transitionX };

  if (isAuthenticated && isLoadingLinkedAccounts) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#F4F4F5" />
      </View>
    );
  }

  if (step === "intro") {
    return <IntroStep transition={transition} onContinue={() => transitionToStep("needs")} />;
  }

  if (step === "needs") {
    return <NeedsStep transition={transition} bubbles={needsBubbles} onContinue={() => transitionToStep("insights")} />;
  }

  if (step === "insights") {
    return (
        <InsightsStep
          transition={transition}
          insights={needInsights}
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
    return <SetupHiStep transition={transition} onContinue={() => transitionToStep("setupName")} />;
  }

  if (step === "setupName") {
    return (
      <SetupNameStep
        transition={transition}
        name={name}
        error={nameError}
        isLoading={isRegisteringDevice}
        onNameChange={(value) => {
          setName(value);
          if (nameError) setNameError(null);
        }}
        onContinue={handleRegisterAndContinue}
      />
    );
  }

  if (step === "setupEmailProvider") {
    return (
      <SetupEmailProviderStep
        transition={transition}
        onSkip={handleSkipEmailLinking}
        onSelectProvider={(provider) => {
          setEmailProvider(provider);
          if (emailError) setEmailError(null);
          transitionToStep("setupEmailCredentials");
        }}
      />
    );
  }

  if (step === "setupEmailCredentials") {
    return (
      <SetupEmailCredentialsStep
        transition={transition}
        provider={emailProvider}
        email={email}
        appPassword={appPassword}
        error={emailError}
        isLoading={isLinkingEmail}
        onEmailChange={(value) => {
          setEmail(value);
          if (emailError) setEmailError(null);
        }}
        onAppPasswordChange={(value) => {
          setAppPassword(value);
          if (emailError) setEmailError(null);
        }}
        onSkip={handleSkipEmailLinking}
        onContinue={handleLinkEmailAndContinue}
      />
    );
  }

  return <SetupNameStep transition={transition} name={name} error={nameError} onNameChange={setName} onContinue={handleRegisterAndContinue} />;
}
