import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, View } from "react-native";
import { getOrCreateDeviceUuid, saveAuthTokens, setOnboardingCompleted, setStoredName } from "@/lib/auth-storage";
import { useAddAccountMutation, useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useRegisterDeviceMutation } from "@/redux/api/authApi";
import { LinkedAccountProvider, useGetLinkedAccountsQuery, useLinkEmailAccountMutation } from "@/redux/api/linkedAccountsApi";
import { setOnboardingComplete, setSession } from "@/redux/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { InsightsStep } from "./onboarding/steps/InsightsStep";
import { IntroStep } from "./onboarding/steps/IntroStep";
import { LogoMorphStep } from "./onboarding/steps/LogoMorphStep";
import { NeedsStep } from "./onboarding/steps/NeedsStep";
import { PrivacyStep } from "./onboarding/steps/PrivacyStep";
import { SetupAccountStep } from "./onboarding/steps/SetupAccountStep";
import { SetupEmailCredentialsStep } from "./onboarding/steps/SetupEmailCredentialsStep";
import { SetupEmailProviderStep } from "./onboarding/steps/SetupEmailProviderStep";
import { SetupHiStep } from "./onboarding/steps/SetupHiStep";
import { SetupNameStep } from "./onboarding/steps/SetupNameStep";
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

const parseDomainNames = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

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

  const [bankName, setBankName] = useState("");
  const [bankDomains, setBankDomains] = useState("");
  const [bankLast4, setBankLast4] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);

  const [registerDevice, { isLoading: isRegisteringDevice }] = useRegisterDeviceMutation();
  const [linkEmailAccount, { isLoading: isLinkingEmail }] = useLinkEmailAccountMutation();
  const [addAccount, { isLoading: isSavingAccount }] = useAddAccountMutation();

  const { data: linkedAccounts = [], isLoading: isLoadingLinkedAccounts } = useGetLinkedAccountsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: accounts = [], isLoading: isLoadingAccounts } = useGetAccountsQuery(undefined, {
    skip: !isAuthenticated,
  });

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

  const completeOnboarding = async () => {
    await setOnboardingCompleted(true);
    dispatch(setOnboardingComplete(true));
  };

  useEffect(() => {
    if (!isAuthenticated || isLoadingLinkedAccounts || isLoadingAccounts) return;

    const hasLinkedEmail = linkedAccounts.some((account) => account.isActive);
    const hasAccount = accounts.length > 0;

    // If user already completed setup in a previous session, skip onboarding.
    if (hasLinkedEmail && hasAccount && step !== "setupAccount") {
      void completeOnboarding();
      return;
    }

    if (hasLinkedEmail && !hasAccount && step !== "setupAccount") {
      animateIntoStep("setupAccount");
      return;
    }

    if (!hasLinkedEmail && step !== "setupEmailProvider" && step !== "setupEmailCredentials") {
      animateIntoStep("setupEmailProvider");
    }
  }, [accounts.length, isAuthenticated, isLoadingAccounts, isLoadingLinkedAccounts, linkedAccounts, step]);

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

      animateIntoStep("setupAccount");
    } catch (requestError) {
      const apiError = requestError as { data?: { message?: string } };
      setEmailError(apiError?.data?.message || "Unable to connect to your mailbox. Check your credentials.");
    }
  };

  const handleSaveAccount = async () => {
    const normalizedTitle = bankName.trim();
    const domainNames = parseDomainNames(bankDomains);
    const normalizedLast4 = bankLast4.trim();

    if (!normalizedTitle) {
      setBankError("Bank name is required.");
      return;
    }

    if (!domainNames.length) {
      setBankError("Add at least one sender domain/email.");
      return;
    }

    if (normalizedLast4 && !/^\d{4}$/.test(normalizedLast4)) {
      setBankError("Last 4 digits must be exactly 4 numbers.");
      return;
    }

    setBankError(null);

    try {
      await addAccount({
        title: normalizedTitle,
        currency: "INR",
        domainNames,
        accountNumber: normalizedLast4 || undefined,
      }).unwrap();
      await completeOnboarding();
    } catch (requestError) {
      const apiError = requestError as { data?: { message?: string } };
      setBankError(apiError?.data?.message || "Could not create account.");
    }
  };

  const transition = { opacity: transitionOpacity, translateX: transitionX };

  if (isAuthenticated && (isLoadingLinkedAccounts || isLoadingAccounts)) {
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
        onContinue={handleLinkEmailAndContinue}
      />
    );
  }

  if (step === "setupAccount") {
    return (
      <SetupAccountStep
        transition={transition}
        bankName={bankName}
        domains={bankDomains}
        last4={bankLast4}
        error={bankError}
        isSaving={isSavingAccount}
        onBankNameChange={(value) => {
          setBankName(value);
          if (bankError) setBankError(null);
        }}
        onDomainsChange={(value) => {
          setBankDomains(value);
          if (bankError) setBankError(null);
        }}
        onLast4Change={(value) => {
          setBankLast4(value.replace(/\D+/g, "").slice(0, 4));
          if (bankError) setBankError(null);
        }}
        onSave={handleSaveAccount}
      />
    );
  }

  return <SetupNameStep transition={transition} name={name} error={nameError} onNameChange={setName} onContinue={handleRegisterAndContinue} />;
}
