"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth.actions";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await loginAction(formData);
    
    if (res.success) {
      router.push(redirectTo);
    } else {
      setError((res as any).error || "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffaf5] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">
        <div className="flex justify-center mb-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white shadow-md">
            <Zap className="h-6 w-6 fill-current"/>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to Aura</h1>
        <p className="text-zinc-500 text-center mb-2 text-sm">Sign in to continue</p>
        {redirectTo !== "/" && (
          <p className="text-orange-600 text-center mb-6 text-xs font-medium bg-orange-50 rounded-xl py-2 px-3">
            🔒 Please sign in to access that page
          </p>
        )}
        {!redirectTo.includes("/") && <div className="mb-4" />}
        
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-700">Email Address</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="you@kaiaura.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-700">Password</label>
            <input name="password" type="password" required className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fffaf5]" />}>
      <LoginForm />
    </Suspense>
  );
}
