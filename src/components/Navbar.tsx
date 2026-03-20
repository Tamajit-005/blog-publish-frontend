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

  // Fetches user session data on mount
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

  // Handles user logout
  const handleLogout = () => {
    window.location.href = "/api/auth/custom-logout";
  };

  // Requests a password reset link
  const handleChangePassword = async () => {
    await fetch("/api/auth/reset-password", { method: "POST" });
    setToast("Password reset link sent to your email");
    setProfileOpen(false);
    setTimeout(() => setToast(null), 3000);
  };

  // Closes the profile dropdown when clicking outside of it
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

  // Generates user initials for the avatar
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const displayName = username || "User";

  return (
    <header className="bg-[#0f111a] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link href="/">
          <img src="/images/Logo.png" alt="Logo" className="h-12 w-auto" />
        </Link>

        {/* NAV — same layout for both desktop and mobile */}
        <nav className="flex items-center gap-4 font-medium">
          {/* Blogs link — desktop only */}
          <Link
            href="/blogs"
            className="hidden md:inline hover:text-teal-400 transition-colors text-lg"
          >
            Blogs
          </Link>

          {!isLoading && (
            <>
              {user ? (
                <>
                  <button
                    onClick={() => router.push("/create")}
                    className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-md text-sm font-semibold text-white transition"
                  >
                    Create
                  </button>

                  {/* PROFILE AVATAR — same on all screen sizes */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setProfileOpen((prev) => !prev)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 border border-gray-600 hover:border-teal-500 transition text-teal-300 font-bold"
                    >
                      {getInitials(displayName)}
                    </button>

                    {/* PROFILE DROPDOWN */}
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 bg-[#1a1c29] w-48 rounded-lg shadow-lg border border-gray-700 text-sm z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-gray-700 text-gray-300">
                            Logged in as
                            <br />
                            <span className="text-teal-400 font-medium">
                              {displayName}
                            </span>
                          </div>

                          <Link
                            href="/blogs"
                            className="block px-4 py-2 hover:bg-teal-700 hover:text-white transition"
                            onClick={() => setProfileOpen(false)}
                          >
                            Your Posts
                          </Link>

                          {user?.role &&
                            ["admin", "superadmin"].includes(user.role) && (
                              <Link
                                href="/admin/blogs"
                                onClick={() => setProfileOpen(false)}
                                className="block px-4 py-2 text-white hover:bg-yellow-700 transition"
                              >
                                Pending Blogs
                              </Link>
                            )}

                          <button
                            onClick={handleChangePassword}
                            className="block w-full text-left px-4 py-2 hover:bg-teal-900 transition"
                          >
                            Change Password
                          </button>

                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white transition"
                          >
                            Logout
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hover:text-teal-400 transition-colors text-sm"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-md text-sm font-semibold text-white transition"
                  >
                    Register
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>

      {/* TOAST NOTIFICATION */}
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
