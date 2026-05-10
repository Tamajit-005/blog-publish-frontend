"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, LogIn, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/custom-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      console.log("✅ Login successful:", data.user?.email);

      localStorage.setItem("custom_user", JSON.stringify(data.user));
      localStorage.setItem("custom_access_token", data.accessToken);

      window.location.href = returnTo;
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04070c] text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-bg.webp')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,6,10,0.55),rgba(3,6,10,0.78))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.08),transparent_26%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(4,7,12,0.18),rgba(4,7,12,0.04),rgba(4,7,12,0.18))]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28">
        <div className="w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[520px]">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[24px] border border-white/8 bg-[rgba(4,10,18,0.86)] px-5 py-7 shadow-[0_12px_52px_rgba(0,0,0,0.38),0_0_28px_rgba(45,212,191,0.06)] backdrop-blur-2xl sm:rounded-[28px] sm:px-8 sm:py-9"
          >
            {/* LOCK ICON */}
            <div className="mb-6 flex justify-center sm:mb-7">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-teal-400/22 bg-[radial-gradient(circle,rgba(45,212,191,0.16),rgba(7,14,22,0.70)_58%)] shadow-[0_0_28px_rgba(45,212,191,0.16),inset_0_0_16px_rgba(45,212,191,0.08)] sm:h-24 sm:w-24">
                <div className="pointer-events-none absolute inset-0 rounded-full border border-teal-300/12" />
                <Lock
                  className="h-9 w-9 text-teal-300 drop-shadow-[0_0_14px_rgba(45,212,191,0.38)] sm:h-10 sm:w-10"
                  strokeWidth={1.8}
                />
              </div>
            </div>

            {/* HEADING */}
            <div className="mb-7 text-center sm:mb-8">
              <h1 className="text-[2.1rem] font-bold tracking-tight text-white sm:text-[2.6rem]">
                Welcome{" "}
                <span className="text-teal-400 drop-shadow-[0_0_14px_rgba(45,212,191,0.24)]">
                  Back
                </span>
              </h1>
              <p className="mt-2 text-[1rem] text-white/58 sm:mt-3 sm:text-[1.08rem]">
                Sign in to your account to continue
              </p>
            </div>

            {/* FORM */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="space-y-5"
            >
              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-[0.97rem] font-semibold text-white/88 sm:text-[1.02rem]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40 sm:h-5 sm:w-5" />
                  <input
                    type="text"
                    value={formData.identifier}
                    onChange={(e) =>
                      setFormData({ ...formData, identifier: e.target.value })
                    }
                    required
                    disabled={loading}
                    autoComplete="username"
                    placeholder="you@example.com"
                    className="h-[54px] w-full rounded-[14px] border border-white/8 bg-[#0a101a]/90 pl-11 pr-4 text-[1rem] text-white placeholder:text-white/32 outline-none transition focus:border-teal-400/32 focus:ring-2 focus:ring-teal-400/12 disabled:cursor-not-allowed disabled:opacity-50 sm:h-[60px] sm:pl-12"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-[0.97rem] font-semibold text-white/88 sm:text-[1.02rem]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40 sm:h-5 sm:w-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-[54px] w-full rounded-[14px] border border-white/8 bg-[#0a101a]/90 pl-11 pr-12 text-[1rem] text-white placeholder:text-white/32 outline-none transition focus:border-teal-400/32 focus:ring-2 focus:ring-teal-400/12 disabled:cursor-not-allowed disabled:opacity-50 sm:h-[60px] sm:pl-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/75"
                    tabIndex={-1}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                    ) : (
                      <Eye className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>

                {/* FORGOT PASSWORD */}
                <div className="mt-2.5 flex justify-end">
                  <Link
                    href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}
                    className="text-[0.94rem] font-medium text-teal-400 transition-colors hover:text-teal-300 sm:text-[0.98rem]"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-3 rounded-[14px] border border-red-500/30 bg-red-500/[0.08] p-4 text-[0.95rem] text-red-300"
                >
                  <span>⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-[51px] w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-teal-400 to-cyan-400 text-[1.08rem] font-bold text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.18)] transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100 sm:h-[62px] sm:text-[1.15rem]"
              >
                <LogIn
                  className="h-[18px] w-[18px] sm:h-5 sm:w-5"
                  strokeWidth={2.2}
                />
                <span>{loading ? "Signing in..." : "Sign In"}</span>
              </button>
            </motion.form>

            {/* SIGN UP LINK */}
            <p className="mt-6 text-center text-[0.96rem] text-white/58 sm:mt-7 sm:text-[1rem]">
              Don&apos;t have an account?{" "}
              <Link
                href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
                className="font-semibold text-teal-400 transition-colors hover:text-teal-300"
              >
                Sign Up
              </Link>
            </p>
          </motion.div>

          {/* PROTECTED BY AUTH0 — all breakpoints */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="mt-5 flex items-center justify-center gap-2.5 text-[0.93rem] text-white/62 sm:mt-6 sm:text-[0.98rem]"
          >
            <ShieldCheck
              className="h-[18px] w-[18px] text-teal-300 drop-shadow-[0_0_10px_rgba(45,212,191,0.24)] sm:h-5 sm:w-5"
              strokeWidth={1.9}
            />
            <p>
              Protected by Auth0 <span className="mx-1 text-white/30">•</span>{" "}
              Secure login
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
