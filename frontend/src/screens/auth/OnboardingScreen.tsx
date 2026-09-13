import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, View } from "react-native";
import { getOrCreateDeviceUuid, saveAuthTokens, setOnboardingCompleted, setStoredName } from "@/lib/auth-storage";
import { useAddAccountMutation, useGetAccountsQuery } from "@/redux/api/accountsApi";
import { useRegisterDeviceMutation } from "@/redux/api/authApi";
import {
  isLinkedAccountActive,
  LinkedAccountProvider,
  useGetLinkedAccountsQuery,
  useLinkEmailAccountMutation,
} from "@/redux/api/linkedAccountsApi";
import { setOnboardingComplete, setSession } from "@/redux/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { SetupAccountStep } from "./onboarding/steps/SetupAccountStep";
import { SetupEmailCredentialsStep } from "./onboarding/steps/SetupEmailCredentialsStep";
import { SetupEmailProviderStep } from "./onboarding/steps/SetupEmailProviderStep";
import { SetupHiStep } from "./onboarding/steps/SetupHiStep";
import { SetupNameStep } from "./onboarding/steps/SetupNameStep";
import type { OnboardingStep } from "./onboarding/types";

const parseDomainNames = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [step, setStep] = useState<OnboardingStep>("setupHi");
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

  const completeOnboarding = async () => {
    await setOnboardingCompleted(true);
    dispatch(setOnboardingComplete(true));
  };

  useEffect(() => {
    if (!isAuthenticated || isLoadingLinkedAccounts || isLoadingAccounts) return;

    const hasLinkedEmail = linkedAccounts.some((account) => isLinkedAccountActive(account.isActive));
    const hasAccount = accounts.length > 0;

    if (hasLinkedEmail && hasAccount && step !== "setupAccount") {
      void completeOnboarding();
      return;
    }

    if (hasLinkedEmail && !hasAccount && step !== "setupAccount") {
      animateIntoStep("setupAccount");
      return;
    }

    if (!hasLinkedEmail && step !== "setupEmailProvider" && step !== "setupEmailCredentials" && step !== "setupAccount") {
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

  const handleSkipEmailLinking = async () => {
    setEmailError(null);
    await completeOnboarding();
  };

  const handleSaveAccount = async () => {
    const normalizedTitle = bankName.trim();
    const domainNames = parseDomainNames(bankDomains);
    const normalizedLast4 = bankLast4.trim();

    if (!normalizedTitle) {
      setBankError("Bank name is required.");
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
