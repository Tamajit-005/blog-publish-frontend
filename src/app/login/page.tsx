"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/strapiAuth";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(identifier.trim(), password.trim());
      router.refresh();
      router.push("/create");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-gray-100 px-4"
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-bold text-teal-400 mb-6"
      >
        Welcome Back
      </motion.h1>

      <motion.form
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        onSubmit={handleLogin}
        className="w-full max-w-sm flex flex-col gap-4 bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800"
      >
        <input
          type="text"
          placeholder="Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 text-gray-100 placeholder-gray-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 text-gray-100 placeholder-gray-500"
          required
        />

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold py-3 rounded-md transition ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-gray-400 text-sm"
      >
        Don’t have an account?{" "}
        <a href="/register" className="text-teal-400 hover:underline">
          Create one
        </a>
      </motion.p>
    </motion.main>
  );
}
