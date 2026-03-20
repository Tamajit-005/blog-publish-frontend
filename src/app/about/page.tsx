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
            width={220}
            height={70}
            className="w-44 h-auto"
            priority
          />
        </div>

        <div className="space-y-6 text-lg leading-relaxed text-gray-400">
          <p>
            <strong className="text-teal-400">Palette Publisher</strong> is a
            modern blogging platform where writers can craft, submit, and share
            their ideas with the world — with a clean, distraction-free
            experience at every step.
          </p>

          <p>
            Every blog goes through a simple review process to ensure quality
            and authenticity, so readers always find content worth their time.
            Writers get a personal space to manage their posts, track status,
            and iterate freely.
          </p>

          <p>
            Built with{" "}
            <span className="text-teal-400 font-medium">Next.js</span>,{" "}
            <span className="text-teal-400 font-medium">MongoDB</span>, and{" "}
            <span className="text-teal-400 font-medium">Strapi</span>,{" "}
            <strong className="text-teal-400">Palette Publisher</strong> is
            designed to be fast, reliable, and straightforward — for both
            writers and readers.
          </p>

          <p>
            Whether you're sharing your first post or your hundredth,{" "}
            <strong className="text-teal-400">Palette Publisher</strong> gives
            you the tools to publish with confidence and reach an audience that
            cares.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
