"use client";

import { useState } from "react";
import { requestPasswordResetAction } from "@/actions/auth.actions";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await requestPasswordResetAction(formData);

    setLoading(false);
    if (res.success) {
      setSubmitted(true);
      const msg =
        res.data?.message ||
        (res as any)?.message ||
        "Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you.";
      setConfirmationMessage(msg);
    } else {
      setError((res as any)?.error || "Failed to submit recovery request. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffaf5] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">
        <div className="flex justify-center mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white shadow-md">
            <ShieldAlert className="h-6 w-6" />
          </span>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 text-zinc-900">Reset Your Password</h1>
        <p className="text-zinc-500 text-center mb-6 text-sm">
          Enter your registered email address or employee ID to submit an admin-assisted password reset request.
        </p>

        {submitted ? (
          <div className="space-y-6">
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/60 p-5 text-sm text-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" />
                <span>Request Submitted</span>
              </div>
              <p className="leading-relaxed text-zinc-700">
                {confirmationMessage ||
                  "Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you."}
              </p>
            </div>

            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium mb-1.5 text-zinc-700">
                  Email Address or Employee ID
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. member@kaiaura.com or EMP002"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? "Submitting Request..." : "Request Password Reset"}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fffaf5]" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
