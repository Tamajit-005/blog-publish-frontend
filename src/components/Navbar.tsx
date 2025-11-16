"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaSearch, FaTimes, FaBars } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { getMe } from "@/lib/getMe";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const me = await getMe();
      setUser(me);
    }
    loadUser();
  }, []);

  // Convert username to initials (EX: "tamajit saha" → "TS")
  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?query=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
  }, [menuOpen, searchOpen]);

  return (
    <header className="bg-[#0f111a] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link href="/">
          <img src="/images/Logo.png" alt="Logo" className="h-12 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 font-medium">
          <Link href="/blogs" className="hover:text-teal-400 transition-colors">
            Blogs
          </Link>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="text-xl hover:text-teal-400 transition-colors"
          >
            <FaSearch />
          </button>

          {/* Publish */}
          <button
            onClick={() => router.push("/create")}
            className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-md text-sm font-semibold text-white transition"
          >
            Publish
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 border border-gray-600 hover:border-teal-500 transition text-teal-300 font-bold"
            >
              {getInitials(user?.username)}
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 bg-[#1a1c29] w-48 rounded-lg shadow-lg border border-gray-700 text-sm z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-700 text-gray-300">
                    Logged in as
                    <br />
                    <span className="text-teal-400 font-medium">
                      {user?.username ?? "Not logged in"}
                    </span>
                  </div>

                  <Link
                    href="/blogs"
                    className="block px-4 py-2 hover:bg-teal-700 hover:text-white transition"
                    onClick={() => setProfileOpen(false)}
                  >
                    Your Posts
                  </Link>

                  <button
                    className="w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white transition"
                    onClick={() => {
                      localStorage.removeItem("jwt");
                      localStorage.removeItem("user");
                      setProfileOpen(false);
                      router.refresh();
                    }}
                  >
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 w-full h-full bg-[#0f111a] px-6 py-10 z-[99] flex flex-col gap-5 overflow-y-auto md:hidden"
          >
            <button
              className="self-end text-2xl hover:text-teal-400"
              onClick={() => setMenuOpen(false)}
            >
              <FaTimes />
            </button>

            <Link
              href="/blogs"
              className="text-lg hover:text-teal-400"
              onClick={() => setMenuOpen(false)}
            >
              Blogs
            </Link>

            <button
              onClick={() => {
                setSearchOpen(true);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 text-lg hover:text-teal-400"
            >
              <FaSearch /> Search
            </button>

            <Link
              href="/create"
              className="bg-teal-600 hover:bg-teal-500 w-fit px-4 py-2 rounded-md text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Publish Blog
            </Link>

            <div className="mt-6 border-t border-gray-700 pt-4">
              <p className="text-gray-500 text-xs mb-2">Account</p>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 text-teal-300 font-bold flex items-center justify-center border border-gray-600">
                  {getInitials(user?.username)}
                </div>
                <span className="text-gray-300 text-sm">
                  {user?.username ?? "Not logged in"}
                </span>
              </div>

              <Link
                href="/blogs"
                className="block py-2 hover:text-teal-400"
                onClick={() => setMenuOpen(false)}
              >
                Your Posts
              </Link>

              <button
                className="text-left py-2 text-red-400 hover:text-red-500"
                onClick={() => {
                  localStorage.removeItem("jwt");
                  localStorage.removeItem("user");
                  setMenuOpen(false);
                  router.refresh();
                }}
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full max-w-md px-6"
            >
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 pl-5 pr-14 rounded-full bg-gray-800 text-xl text-white shadow-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
              <button
                type="submit"
                className="absolute right-9 top-1/2 -translate-y-1/2 text-teal-400 text-2xl hover:text-teal-300"
              >
                <FaSearch />
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute -top-10 right-2 text-white text-2xl hover:text-red-500"
              >
                <FaTimes />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
