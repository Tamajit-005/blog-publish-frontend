"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function AboutPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full min-h-screen bg-slate-950 text-gray-300 py-12 px-4"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <h1 className="text-4xl font-bold text-teal-500">About</h1>
          <Image
            src="/images/Logo.png"
            alt="Logo"
            width={160}
            height={50}
            className="h-10 w-auto"
            priority
          />
        </div>

        <div className="space-y-6 text-lg leading-relaxed text-gray-400">
          <p>
            <strong className="text-teal-400">Palette Publisher</strong> is a
            modern digital publication built for developers who value clarity,
            precision, and practical knowledge. Our goal is simple: deliver
            high-quality insights that help you build better, faster, and
            smarter in today’s evolving web ecosystem.
          </p>

          <p>
            We focus on actionable guidance—covering backend engineering, Strapi
            workflows, frontend architecture, API design, and the tools shaping
            modern development. Every piece is crafted to remove noise and
            highlight what actually matters.
          </p>

          <p>
            Powered by{" "}
            <span className="text-teal-400 font-medium">Next.js</span> and{" "}
            <span className="text-teal-400 font-medium">Strapi</span>, Palette
            Publisher delivers a fast, smooth, and performance-first reading
            experience designed for developers at every level.
          </p>

          <p>
            Whether you’re exploring new technologies or refining your workflow,
            Palette Publisher gives you the clean explanations and practical
            depth needed to move with confidence.
          </p>
        </div>

        <div className="text-center mt-10">
          <a
            href="/blogs"
            className="text-teal-500 font-medium hover:text-teal-300 hover:underline transition"
          >
            Explore your latest publications →
          </a>
        </div>
      </div>
    </motion.div>
  );
}
