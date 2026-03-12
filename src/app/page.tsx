"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type UserInfo = {
  username: string;
  role?: "user" | "admin" | "superadmin";
};

export default function HomePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/username")
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin =
    user?.role === "admin" || user?.role === "superadmin";

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-gray-200 px-6 text-center">
      {/* 🔹 TITLE */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-6xl font-bold text-teal-400 mb-4"
      >
        {user ? `Welcome back, ${user.username} 👋` : "Welcome to Palette Publisher"}
      </motion.h1>

      {/* 🔹 SUBTITLE */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-gray-400 max-w-xl leading-relaxed mb-10"
      >
        {user ? (
          <>
            Manage your blogs, create new stories, and track approvals.
            <br />
            Everything you need is right here.
          </>
        ) : (
          <>
            Create, edit, and publish your blogs with complete control.
            <br />
            Your stories deserve the spotlight — we’ll handle the rest.
          </>
        )}
      </motion.p>

      {/* 🔹 CTA BUTTONS */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        {!loading && (
          <>
            {/* ❌ NOT LOGGED IN */}
            {!user && (
              <>
                <Link
                  href="/blogs"
                  className="px-6 py-3 bg-teal-500 hover:bg-teal-400
                             text-slate-900 font-semibold rounded-lg shadow-md
                             transition-all duration-200"
                >
                  Explore Blogs
                </Link>

                <Link
                  href="/login"
                  className="px-6 py-3 border border-teal-500 text-teal-400
                             rounded-lg hover:bg-teal-500 hover:text-slate-900
                             font-semibold transition-all duration-200"
                >
                  Login to Publish
                </Link>
              </>
            )}

            {/* ✅ LOGGED IN – USER / ADMIN */}
            {user && (
              <>
                <Link
                  href="/blogs"
                  className="px-6 py-3 border border-teal-500 text-teal-400
                             rounded-lg hover:bg-teal-500 hover:text-slate-900
                             font-semibold transition-all duration-200"
                >
                  Explore / Create Blogs
                </Link>

                {/* 🌍 VISIT MAIN SITE */}
                <a
                  href="https://strapi-rho-five.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-600 text-gray-300
                             rounded-lg hover:bg-gray-700 hover:text-white
                             font-semibold transition-all duration-200"
                >
                  Visit Main Site
                </a>
              </>
            )}

            {/* 🟡 ADMIN + SUPERADMIN */}
            {isAdmin && (
              <Link
                href="/admin/blogs"
                className="px-6 py-3 border border-yellow-500 text-yellow-400
                           rounded-lg hover:bg-yellow-500 hover:text-slate-900
                           font-semibold transition-all duration-200"
              >
                Pending Blogs
              </Link>
            )}
          </>
        )}
      </motion.div>

      {/* 🔹 FOOTER */}
      <footer className="mt-16 text-sm text-gray-600">
        © {new Date().getFullYear()} Palette Publisher. All rights reserved.
      </footer>
    </main>
  );
}
