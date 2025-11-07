"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-gray-200 px-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-6xl font-bold text-teal-400 mb-4"
      >
        Welcome to Palette Publisher
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-gray-400 max-w-xl leading-relaxed mb-10"
      >
        Create, edit, and publish your blogs with complete control.
        <br />
        Your stories deserve the spotlight — we’ll handle the rest.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Link
          href="/blogs"
          className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-lg shadow-md transition-all duration-200"
        >
          Explore Blogs
        </Link>

        <Link
          href="/api/auth/login"
          className="px-6 py-3 border border-teal-500 text-teal-400 rounded-lg hover:bg-teal-500 hover:text-slate-900 font-semibold transition-all duration-200"
        >
          Login to Publish
        </Link>
      </motion.div>

      <footer className="mt-16 text-sm text-gray-600">
        © {new Date().getFullYear()} Palette Publisher. All rights reserved.
      </footer>
    </main>
  );
}
