"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Check,
  X,
  UserPlus,
  Mail,
  User,
  Lock,
  ShieldCheck,
} from "lucide-react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const passwordChecks = useMemo(() => {
    const password = formData.password;
    return {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [formData.password]);

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!allChecksPassed) {
      setError("Please meet all password requirements");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Signup failed");
      setLoading(false);
    }
  };

  /* ── SUCCESS STATE ── */
  if (success) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#04070c] p-4">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/hero-bg.webp')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,6,10,0.65),rgba(3,6,10,0.85))]" />
        </div>

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-[480px] rounded-[32px] border border-white/8 bg-[rgba(4,10,18,0.9)] p-10 text-center shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 220 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-teal-400/25 bg-teal-400/10 shadow-[0_0_32px_rgba(45,212,191,0.22)]"
          >
            <Check size={38} className="text-teal-300" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-[2.1rem] font-black tracking-tight text-teal-400">
            Account Created!
          </h1>
          <p className="mt-3 text-white/80">Welcome to Palette Publisher! 🎉</p>
          <p className="mt-1 text-white/45 text-sm">Redirecting to login...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04070c] text-white">
      {/* BACKGROUND (Identical to Login) */}
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
            {/* USER ICON (Matches Lock Icon style) */}
            <div className="mb-6 flex justify-center sm:mb-7">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-teal-400/22 bg-[radial-gradient(circle,rgba(45,212,191,0.16),rgba(7,14,22,0.70)_58%)] shadow-[0_0_28px_rgba(45,212,191,0.16),inset_0_0_16px_rgba(45,212,191,0.08)] sm:h-24 sm:w-24">
                <div className="pointer-events-none absolute inset-0 rounded-full border border-teal-300/12" />
                <UserPlus
                  className="h-9 w-9 text-teal-300 drop-shadow-[0_0_14px_rgba(45,212,191,0.38)] sm:h-10 sm:w-10"
                  strokeWidth={1.8}
                />
              </div>
            </div>

            {/* HEADING (Matches Login Heading) */}
            <div className="mb-7 text-center sm:mb-8">
              <h1 className="text-[2.1rem] font-bold tracking-tight text-white sm:text-[2.6rem]">
                Create{" "}
                <span className="text-teal-400 drop-shadow-[0_0_14px_rgba(45,212,191,0.24)]">
                  Account
                </span>
              </h1>
              <p className="mt-2 text-[1rem] text-white/58 sm:mt-3 sm:text-[1.08rem]">
                Join Palette Publisher and start creating
              </p>
            </div>

            {/* FORM */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="space-y-4"
            >
              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-[0.97rem] font-semibold text-white/88 sm:text-[1.02rem]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40 sm:h-5 sm:w-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={loading}
                    placeholder="you@example.com"
                    className="h-[54px] w-full rounded-[14px] border border-white/8 bg-[#0a101a]/90 pl-11 pr-4 text-[1rem] text-white placeholder:text-white/32 outline-none transition focus:border-teal-400/32 focus:ring-2 focus:ring-teal-400/12 disabled:cursor-not-allowed disabled:opacity-50 sm:h-[60px] sm:pl-12"
                  />
                </div>
              </div>

              {/* USERNAME */}
              <div>
                <label className="mb-2 block text-[0.97rem] font-semibold text-white/88 sm:text-[1.02rem]">
                  Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40 sm:h-5 sm:w-5" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    disabled={loading}
                    placeholder="Username"
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
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    disabled={loading}
                    placeholder="Minimum 8 characters"
                    className="h-[54px] w-full rounded-[14px] border border-white/8 bg-[#0a101a]/90 pl-11 pr-12 text-[1rem] text-white placeholder:text-white/32 outline-none transition focus:border-teal-400/32 focus:ring-2 focus:ring-teal-400/12 disabled:cursor-not-allowed disabled:opacity-50 sm:h-[60px] sm:pl-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/75"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* PASSWORD REQUIREMENTS BLOCK */}
                <AnimatePresence>
                  {(formData.password.length > 0 || passwordFocused) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      // Use a standard ease for smoother height transitions
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="mt-3 overflow-hidden rounded-2xl border border-white/6 bg-[#0c1220] p-4"
                    >
                      {/* Changed to a vertical flex column for all devices */}
                      <div className="flex flex-col gap-2.5">
                        {[
                          {
                            key: "length",
                            label: "At least 8 characters in length",
                          },
                          {
                            key: "lowercase",
                            label: "Lower case letters (a-z)",
                          },
                          {
                            key: "uppercase",
                            label: "Upper case letters (A-Z)",
                          },
                          { key: "number", label: "Numbers (0-9)" },
                          {
                            key: "special",
                            label: "Special characters (!@#$%^&*)",
                          },
                        ].map(({ key, label }) => {
                          const passed =
                            passwordChecks[key as keyof typeof passwordChecks];
                          return (
                            <motion.div
                              key={key}
                              layout // Helps prevent layout snapping during expansion
                              className="flex items-center gap-3"
                            >
                              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                {passed ? (
                                  <Check
                                    size={14}
                                    className="text-teal-400"
                                    strokeWidth={3}
                                  />
                                ) : (
                                  <X
                                    size={14}
                                    className="text-white/20"
                                    strokeWidth={3}
                                  />
                                )}
                              </div>
                              <span
                                className={`text-[0.82rem] transition-colors duration-300 ${
                                  passed ? "text-teal-300" : "text-white/40"
                                }`}
                              >
                                {label}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading || !allChecksPassed}
                className="mt-2 flex h-[51px] w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-teal-400 to-cyan-400 text-[1.08rem] font-bold text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.18)] transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 sm:h-[62px] sm:text-[1.15rem]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin text-slate-950"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  <>
                    <UserPlus size={20} strokeWidth={2.2} />
                    <span>Sign Up</span>
                  </>
                )}
              </button>
            </motion.form>

            {/* LOGIN LINK */}
            <p className="mt-6 text-center text-[0.96rem] text-white/58 sm:mt-7 sm:text-[1rem]">
              Already have an account?{" "}
              <Link
                href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                className="font-semibold text-teal-400 transition-colors hover:text-teal-300"
              >
                Log In
              </Link>
            </p>
          </motion.div>

          {/* FOOTER TEXT */}
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
              Secure signup
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
