"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, ShieldCheck, ArrowLeft, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setMessage("Password reset email sent. Please check your inbox.");
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04070c] text-white">
      {/* BACKGROUND (Matches Login/Signup) */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
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
            {/* KEY ICON */}
            <div className="mb-6 flex justify-center sm:mb-7">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-teal-400/22 bg-[radial-gradient(circle,rgba(45,212,191,0.16),rgba(7,14,22,0.70)_58%)] shadow-[0_0_28px_rgba(45,212,191,0.16),inset_0_0_16px_rgba(45,212,191,0.08)] sm:h-24 sm:w-24">
                <div className="pointer-events-none absolute inset-0 rounded-full border border-teal-300/12" />
                <KeyRound
                  className="h-9 w-9 text-teal-300 drop-shadow-[0_0_14px_rgba(45,212,191,0.38)] sm:h-10 sm:w-10"
                  strokeWidth={1.8}
                />
              </div>
            </div>

            {/* HEADING */}
            <div className="mb-7 text-center sm:mb-8">
              <h1 className="text-[2.1rem] font-bold tracking-tight text-white sm:text-[2.6rem]">
                Reset{" "}
                <span className="text-teal-400 drop-shadow-[0_0_14px_rgba(45,212,191,0.24)]">
                  Password
                </span>
              </h1>
              <p className="mt-2 text-[1rem] text-white/58 sm:mt-3 sm:text-[1.08rem]">
                Enter your email to receive a reset link
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="you@example.com"
                    className="h-[54px] w-full rounded-[14px] border border-white/8 bg-[#0a101a]/90 pl-11 pr-4 text-[1rem] text-white placeholder:text-white/32 outline-none transition focus:border-teal-400/32 focus:ring-2 focus:ring-teal-400/12 disabled:cursor-not-allowed disabled:opacity-50 sm:h-[60px] sm:pl-12"
                  />
                </div>
              </div>

              {/* MESSAGES */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: "auto" }}
                    exit={{ opacity: 0, scale: 0.97, height: 0 }}
                    className="flex items-start gap-3 rounded-[14px] border border-red-500/30 bg-red-500/[0.08] p-4 text-[0.95rem] text-red-300"
                  >
                    <span>⚠️</span>
                    <span>{error}</span>
                  </motion.div>
                )}

                {message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: "auto" }}
                    exit={{ opacity: 0, scale: 0.97, height: 0 }}
                    className="flex items-start gap-3 rounded-[14px] border border-emerald-500/30 bg-emerald-500/[0.08] p-4 text-[0.95rem] text-emerald-300"
                  >
                    <span>✅</span>
                    <span>{message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-[51px] w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-teal-400 to-cyan-400 text-[1.08rem] font-bold text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.18)] transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100 sm:h-[62px] sm:text-[1.15rem]"
              >
                <Send
                  className="h-[18px] w-[18px] sm:h-5 sm:w-5"
                  strokeWidth={2.2}
                />
                <span>{loading ? "Sending..." : "Send Reset Link"}</span>
              </button>
            </motion.form>

            {/* BACK TO LOGIN */}
            <div className="mt-6 text-center sm:mt-7">
              <Link
                href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                className="inline-flex items-center gap-2 text-[0.96rem] font-semibold text-teal-400 transition-colors hover:text-teal-300 sm:text-[1rem]"
              >
                <ArrowLeft size={18} />
                <span>Back to Login</span>
              </Link>
            </div>
          </motion.div>

          {/* PROTECTED FOOTER */}
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
              Secure recovery
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
