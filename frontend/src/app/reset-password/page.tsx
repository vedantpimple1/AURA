"use client";

import { useState, useEffect, useRef } from "react";
import { resetPasswordAction, validateResetTokenAction } from "@/actions/auth.actions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Clock,
  ShieldAlert,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Suspense } from "react";

interface TokenState {
  valid: boolean;
  reason?: "MISSING_TOKEN" | "INVALID" | "ALREADY_USED" | "EXPIRED" | "INACTIVE";
  message?: string;
  expiresAt?: string;
  maskedEmail?: string;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token");

  const [token, setToken] = useState<string>("");
  const [isValidating, setIsValidating] = useState(true);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validatedRef = useRef(false);

  // Eager validation on load (guarded by validatedRef so it never re-runs on URL change)
  useEffect(() => {
    if (validatedRef.current) return;

    if (!rawToken || !rawToken.trim()) {
      setIsValidating(false);
      setTokenState({
        valid: false,
        reason: "MISSING_TOKEN",
        message: "No reset token was found in the link. Please request a new link.",
      });
      return;
    }

    validatedRef.current = true;
    const currentToken = rawToken.trim();

    async function checkToken() {
      try {
        const res = await validateResetTokenAction(currentToken);
        if (res.success && res.data?.valid) {
          setToken(currentToken);
          setTokenState(res.data);
          if (res.data.expiresAt) {
            const diff = Math.max(
              0,
              Math.floor((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000)
            );
            setRemainingSeconds(diff);
          }
        } else {
          setToken("");
          setTokenState({
            valid: false,
            reason: res.data?.reason || "INVALID",
            message:
              res.data?.message ||
              "This password reset link is invalid, expired, or has already been used.",
          });
        }
      } catch {
        setToken("");
        setTokenState({
          valid: false,
          reason: "INVALID",
          message: "Unable to verify the reset link. Please check your network connection.",
        });
      } finally {
        setIsValidating(false);
      }
    }

    checkToken();
  }, [rawToken]);

  // Live countdown timer for the 15-minute window
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setToken("");
          setTokenState({
            valid: false,
            reason: "EXPIRED",
            message: "This password reset link has expired. One-time reset links are valid for 15 minutes.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!token || !tokenState?.valid) {
      setError("This reset link is no longer valid or has expired.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordAction(token, password);
      setLoading(false);

      if (res.success) {
        setSuccess(true);
        // Immediately invalidate client-held token
        setToken("");
        setTokenState({ valid: false, reason: "ALREADY_USED" });
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setError(
          (res as any)?.error ||
            "Failed to reset password. The link may have expired or was already used."
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "An unexpected network error occurred.");
    }
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffaf5] px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">
        <div className="flex justify-center mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </span>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 text-zinc-900">Set New Password</h1>
        <p className="text-zinc-500 text-center mb-6 text-sm">
          Complete your account recovery with a secure new password.
        </p>

        {isValidating ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-zinc-500">
            <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Verifying reset link security...</p>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-5 text-sm text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Password Reset Successfully!</span>
              </div>
              <p className="text-emerald-700 leading-relaxed text-xs">
                Your password has been securely updated and this one-time link is now expired. All previous active sessions have been invalidated for your security.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700 shadow-md"
            >
              <span>Sign In with New Password</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : !tokenState?.valid ? (
          /* Distinct Security Block Cards for Already Used, Expired, or Invalid Links */
          <div className="space-y-6">
            {tokenState?.reason === "ALREADY_USED" ? (
              <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-5 text-sm text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                  <span>Link Already Used</span>
                </div>
                <p className="text-amber-800/90 leading-relaxed text-xs">
                  This one-time password reset link has already been used and is permanently expired. Each security link can only be used once.
                </p>
              </div>
            ) : tokenState?.reason === "EXPIRED" ? (
              <div className="rounded-2xl bg-red-50 border border-red-200/70 p-5 text-sm text-red-950 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-red-800">
                  <Clock className="h-5 w-5 text-red-600 shrink-0" />
                  <span>Reset Link Expired</span>
                </div>
                <p className="text-red-800/90 leading-relaxed text-xs">
                  For your security, one-time password reset links expire 15 minutes after issuance. This link is no longer valid.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-5 text-sm text-zinc-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-zinc-800">
                  <AlertTriangle className="h-5 w-5 text-zinc-500 shrink-0" />
                  <span>Invalid or Missing Link</span>
                </div>
                <p className="text-zinc-600 leading-relaxed text-xs">
                  {tokenState?.message ||
                    "This password reset link is invalid, incomplete, or has expired. Please request a new recovery link."}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {tokenState?.reason === "ALREADY_USED" ? (
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700 shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Sign In
                </Link>
              ) : (
                <Link
                  href="/forgot-password"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700 shadow-sm"
                >
                  Request New Reset Link
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Valid Unconsumed Token Form */
          <>
            {/* Account & Timer Badge */}
            <div className="mb-5 rounded-2xl bg-orange-50/70 border border-orange-200/50 p-3.5 flex items-center justify-between text-xs">
              <div className="text-zinc-700 font-medium truncate max-w-[200px]">
                Account: <span className="text-orange-900 font-semibold">{tokenState.maskedEmail || "Verified Member"}</span>
              </div>
              {remainingSeconds !== null && (
                <div
                  className={`inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded-lg text-[11px] ${
                    remainingSeconds < 180
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : "bg-orange-100 text-orange-800"
                  }`}
                  title="Link validity window"
                >
                  <Clock className="h-3 w-3" />
                  <span>{formatTimer(remainingSeconds)}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 text-center border border-red-100 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 pr-10"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Re-enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || remainingSeconds === 0}
                className="mt-6 w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50 shadow-sm"
              >
                {loading ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fffaf5]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
