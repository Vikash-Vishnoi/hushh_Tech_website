/**
 * Signup Page — All Business Logic
 *
 * Contains:
 * - Auth session check & redirect
 * - OAuth sign-up handlers (Apple, Google)
 * - Loading state management
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { redirectToUrl } from "../../auth/authHost";
import { DEFAULT_AUTH_REDIRECT, sanitizeInternalRedirect } from "../../utils/security";
import { useAuthSession } from "../../auth/AuthSessionProvider";

/* ─── Types ─── */
export interface SignupLogic {
  isLoading: boolean;
  isSigningIn: boolean;
  oauthError: string | null;
  oauthFallbackUrl: string | null;
  handleAppleSignIn: () => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
}

/* ─── Main Hook ─── */
export const useSignupLogic = (): SignupLogic => {
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [oauthError, setOAuthError] = useState<string | null>(null);
  const [oauthFallbackUrl, setOAuthFallbackUrl] = useState<string | null>(null);
  const { status, startOAuth } = useAuthSession();

  // Stable redirect path — computed once from URL params
  const redirectPath = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return sanitizeInternalRedirect(params.get("redirect"), DEFAULT_AUTH_REDIRECT);
  }, []);

  /* Auth session listener — redirect if already logged in */
  useEffect(() => {
    if (status === "authenticated") {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, status]);

  const handleOAuthFailure = useCallback(
    (message: string, fallbackUrl?: string) => {
      setIsSigningIn(false);
      setOAuthError(message);
      setOAuthFallbackUrl(fallbackUrl || null);
      if (fallbackUrl) {
        redirectToUrl(fallbackUrl);
      }
    },
    []
  );

  /* Apple OAuth — prevent double-clicks */
  const handleAppleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setOAuthError(null);
    setOAuthFallbackUrl(null);
    const result = await startOAuth("apple");
    if (!result.ok) {
      handleOAuthFailure(result.message, result.redirectTo);
    }
  }, [handleOAuthFailure, isSigningIn, startOAuth]);

  /* Google OAuth — prevent double-clicks */
  const handleGoogleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setOAuthError(null);
    setOAuthFallbackUrl(null);
    const result = await startOAuth("google");
    if (!result.ok) {
      handleOAuthFailure(result.message, result.redirectTo);
    }
  }, [handleOAuthFailure, isSigningIn, startOAuth]);

  return {
    isLoading: status === "booting",
    isSigningIn,
    oauthError,
    oauthFallbackUrl,
    handleAppleSignIn,
    handleGoogleSignIn,
  };
};
