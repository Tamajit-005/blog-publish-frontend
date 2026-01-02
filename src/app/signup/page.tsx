"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check, X } from "lucide-react";

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

  // Password validation checks
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

    // Client-side validation
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

      // Redirect to custom login page after 2 seconds
      setTimeout(() => {
        window.location.href = "/login"; // ← Updated to custom login!
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-slate-900 rounded-lg p-8 text-center border border-teal-500/20 shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-7xl mb-4"
          >
            ✅
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-teal-400 mb-3"
          >
            Account Created!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 mb-2"
          >
            Welcome to Palette Publisher! 🎉
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-500 text-sm mb-6"
          >
            Redirecting to login...
          </motion.p>
          <div className="animate-pulse bg-teal-500/10 rounded-lg p-4 border border-teal-500/30">
            <p className="text-teal-400 text-sm font-medium">
              Get ready to publish amazing content ✨
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-teal-400 mb-3">
            Create Account
          </h1>
          <p className="text-gray-400">
            Join Palette Publisher and start creating
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-slate-900 rounded-lg p-8 shadow-2xl border border-slate-800"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-gray-300 mb-2 font-medium text-sm">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={loading}
                className="w-full p-3 rounded-md bg-slate-800 text-gray-100 border border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="your@email.com"
              />
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-gray-300 mb-2 font-medium text-sm">
                Username
              </label>
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
                className="w-full p-3 rounded-md bg-slate-800 text-gray-100 border border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none transition font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Username"
              />
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full"></span>
                Case-sensitive • Letters, numbers, underscore only
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-gray-300 mb-2 font-medium text-sm">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  minLength={8}
                  disabled={loading}
                  className="w-full p-3 pr-12 rounded-md bg-slate-800 text-gray-100 border border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {(formData.password.length > 0 || passwordFocused) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 bg-slate-800 rounded-md p-4 border border-slate-700"
                >
                  <p className="text-xs text-gray-400 font-medium mb-3">
                    Password must contain:
                  </p>

                  {/* Length Check */}
                  <div className="flex items-center gap-2 text-sm">
                    {passwordChecks.length ? (
                      <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        passwordChecks.length
                          ? "text-teal-400"
                          : "text-gray-400"
                      }
                    >
                      At least 8 characters in length
                    </span>
                  </div>

                  {/* Lowercase Check */}
                  <div className="flex items-center gap-2 text-sm">
                    {passwordChecks.lowercase ? (
                      <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        passwordChecks.lowercase
                          ? "text-teal-400"
                          : "text-gray-400"
                      }
                    >
                      Lower case letters (a-z)
                    </span>
                  </div>

                  {/* Uppercase Check */}
                  <div className="flex items-center gap-2 text-sm">
                    {passwordChecks.uppercase ? (
                      <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        passwordChecks.uppercase
                          ? "text-teal-400"
                          : "text-gray-400"
                      }
                    >
                      Upper case letters (A-Z)
                    </span>
                  </div>

                  {/* Number Check */}
                  <div className="flex items-center gap-2 text-sm">
                    {passwordChecks.number ? (
                      <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        passwordChecks.number
                          ? "text-teal-400"
                          : "text-gray-400"
                      }
                    >
                      Numbers (0-9)
                    </span>
                  </div>

                  {/* Special Characters Check */}
                  <div className="flex items-center gap-2 text-sm">
                    {passwordChecks.special ? (
                      <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        passwordChecks.special
                          ? "text-teal-400"
                          : "text-gray-400"
                      }
                    >
                      Special characters (!@#$%^&*)
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm flex items-start gap-2"
              >
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !allChecksPassed}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold py-3 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-400 mt-6 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              Log In
            </Link>
          </p>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-600 text-xs mt-6"
        >
          By signing up, you agree to our terms and privacy policy
        </motion.p>
      </div>
    </div>
  );
}
