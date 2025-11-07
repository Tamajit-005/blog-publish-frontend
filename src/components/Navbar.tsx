"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaSearch, FaTimes, FaBars } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hardcoded categories (replace with GraphQL query later)
  const categories = [
    { label: "Gaming", id: "zxhivhcsvvo4bwsv8lrijpop" },
    { label: "Tech", id: "icchgazsjbhc07ogtzksx6dq" },
    { label: "Food", id: "o5d6wlqkmmea2nkp17ziea7z" },
    { label: "Nature", id: "kaigx15rehooagdlsb2q9x9k" },
    { label: "Culture", id: "h1oaqs7skpgwx42u765xqrc2" },
    { label: "Entertainment", id: "ynv7oa1i6v09tx54w7pfyrze" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?query=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const toggleDropdown = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
  }, [menuOpen, searchOpen]);

  return (
    <header className="bg-[#0f111a] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link href="/" onClick={() => setDropdownOpen(false)}>
          <Image
            src="/images/Logo.png"
            alt="Logo"
            width={160}
            height={50}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 font-medium">
          <Link
            href="/"
            className="hover:text-teal-400 transition-colors"
            onClick={() => setDropdownOpen(false)}
          >
            Blogs
          </Link>

          {/* Categories */}
          <div
            className="relative"
            onMouseEnter={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              setDropdownOpen(true);
            }}
            onMouseLeave={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(
                () => setDropdownOpen(false),
                200
              );
            }}
          >
            <button
              onClick={toggleDropdown}
              className="hover:text-teal-400 transition-colors"
            >
              Categories
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="absolute left-0 mt-2 bg-[#1a1c29] border border-gray-700 rounded-lg shadow-lg w-44 z-50"
                >
                  <ul className="py-2 text-sm">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/category/${encodeURIComponent(c.id)}`}
                          className="block px-4 py-2 hover:bg-teal-700 hover:text-white transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search */}
          <button
            onClick={() => setSearchOpen((prev) => !prev)}
            className="text-xl hover:text-teal-400 transition-colors"
          >
            <FaSearch />
          </button>

          {/* Placeholder for Auth0 login/logout */}
          <button
            onClick={() => router.push("/create")}
            className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-md text-sm font-semibold text-white transition"
          >
            Publish
          </button>
        </nav>

        {/* Mobile Hamburger */}
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
            key="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 left-0 w-full h-full bg-[#0f111a] px-6 py-10 z-[99] flex flex-col gap-4 overflow-y-auto md:hidden"
          >
            <button
              className="self-end text-2xl hover:text-teal-400 transition"
              onClick={() => setMenuOpen(false)}
            >
              <FaTimes />
            </button>

            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-lg hover:text-teal-400"
            >
              Blogs
            </Link>

            <div className="mt-4">
              <p className="text-gray-400 text-sm uppercase">Categories</p>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${encodeURIComponent(c.id)}`}
                  className="block py-2 hover:text-teal-400"
                  onClick={() => setMenuOpen(false)}
                >
                  {c.label}
                </Link>
              ))}
            </div>

            <button
              onClick={() => {
                setSearchOpen(true);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 text-lg hover:text-teal-400 mt-6"
            >
              <FaSearch /> Search
            </button>

            <button
              onClick={() => router.push("/create")}
              className="bg-teal-600 hover:bg-teal-500 w-fit px-4 py-2 rounded-md text-sm font-semibold text-white mt-4"
            >
              Publish Blog
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-modal"
            initial={{ opacity: 0, y: -25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
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
                className="absolute right-9 top-1/2 -translate-y-1/2 text-teal-400 text-2xl hover:text-teal-300 transition"
              >
                <FaSearch />
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute -top-10 right-2 text-white text-2xl hover:text-red-500 transition"
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
