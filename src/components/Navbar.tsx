"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const router = useRouter();
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/user/username")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        setUsername(data.username);
        setUser(data);
      })
      .catch(() => {
        setUsername(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/auth/custom-logout";
  };

  const handleChangePassword = async () => {
    await fetch("/api/auth/reset-password", { method: "POST" });
    setToast("Password reset link sent to your email");
    setProfileOpen(false);
    setTimeout(() => setToast(null), 3000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const getInitials = (name?: string) =>
    name ? name[0].toUpperCase() : "U";

  return (
    <header className="bg-[#0f111a] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">

        {/* Logo */}
        <Link href="/">
          <img src="/images/Logo.png" alt="Logo" className="h-12" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 font-medium">

          <Link href="/blogs" className="hover:text-teal-400">
            Blogs
          </Link>

          {!isLoading && user && (
            <>
              {/* Create Blog */}
              <button
                onClick={() => router.push("/create")}
                className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-md text-sm font-semibold"
              >
                Create
              </button>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((p) => !p)}
                  className="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 hover:border-teal-500 text-teal-300 font-bold"
                >
                  {getInitials(username || undefined)}
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 bg-[#1a1c29] w-52 rounded-lg shadow-lg border border-gray-700 text-sm z-50"
                    >

                      {/* Username */}
                      <div className="px-4 py-3 border-b border-gray-700 text-gray-300">
                        Logged in as
                        <br />
                        <span className="text-teal-400 font-medium">
                          {username}
                        </span>
                      </div>

                      {/* Your Posts */}
                      <Link
                        href="/blogs"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 hover:bg-teal-700"
                      >
                        Your Posts
                      </Link>

                      {/* Admin Panel */}
                      {(user.role === "admin" ||
                        user.role === "superadmin") && (
                        <Link
                          href="/admin/blogs"
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 hover:bg-yellow-700"
                        >
                          Pending Blogs
                        </Link>
                      )}

                      {/* Change Password */}
                      <button
                        onClick={handleChangePassword}
                        className="block w-full text-left px-4 py-2 hover:bg-teal-900"
                      >
                        Change Password
                      </button>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white"
                      >
                        Logout
                      </button>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {!isLoading && !user && (
            <>
              <Link href="/login">Login</Link>

              <Link
                href="/signup"
                className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-md text-sm font-semibold"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div className="bg-slate-900 border border-teal-500 text-teal-400 px-6 py-4 rounded-xl shadow-2xl text-sm">
              {toast}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;