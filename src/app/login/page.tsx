"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  // 🔁 CHANGE 1: email → identifier
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

        // 🔁 CHANGE 2: send identifier instead of email
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
            Welcome Back
          </h1>
          <p className="text-gray-400">
            Log in to continue to Palette Publisher
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
            {/* Identifier Field */}
            <div>
              <label className="block text-gray-300 mb-2 font-medium text-sm">
                Email or Username
              </label>

              {/* 🔁 CHANGE 3: type="text" + identifier */}
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) =>
                  setFormData({ ...formData, identifier: e.target.value })
                }
                required
                disabled={loading}
                autoComplete="username"
                className="w-full p-3 rounded-md bg-slate-800 text-gray-100 border border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Email or username"
              />
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
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full p-3 pr-12 rounded-md bg-slate-800 text-gray-100 border border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex justify-end mt-2">
                <Link
                  href={`/forgot-password?returnTo=${encodeURIComponent(
                    returnTo
                  )}`}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold py-3 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {/* Signup Link */}
          <p className="text-center text-gray-400 mt-6 text-sm">
            Don't have an account?{" "}
            <Link
              href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-600 text-xs mt-6"
        >
          Protected by Auth0 • Secure authentication
        </motion.p>
      </div>
    </div>
  );
}
