"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BookOpen, Info, Mail, Clock } from "lucide-react";

const Navbar = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

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

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const displayName = username || "User";

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/blogs", label: "Blogs", icon: BookOpen },
    { href: "/about", label: "About", icon: Info },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  if (user?.role && ["admin", "superadmin"].includes(user.role)) {
    navLinks.push({ href: "/admin/blogs", label: "Pending", icon: Clock });
  }

  return (
    <>
      {/* Changed to absolute to scroll away */}
      <header className="absolute top-0 left-0 z-50 w-full">
        <div
          className={`mx-auto max-w-7xl px-4 md:px-10 ${
            profileOpen ? "pb-40 md:pb-0" : ""
          }`}
        >
          {/* Top Row: Logo + Actions */}
          <div className="flex h-[88px] md:h-24 items-center justify-between">
            {/* LOGO */}
            <Link
              href="/"
              className="flex shrink-0 translate-y-2 md:translate-y-3 items-center transition-all duration-500 hover:scale-[1.02] hover:opacity-95"
            >
              <img
                src="/images/Logo.webp"
                alt="Palette Publisher"
                className="-translate-x-2 md:-translate-x-4 -translate-y-1 h-[72px] md:h-[88px] w-auto object-contain drop-shadow-[0_0_18px_rgba(45,212,191,0.22)] lg:h-[112px]"
              />
            </Link>

            {/* ── DESKTOP CENTER NAV ── */}
            <nav className="hidden md:flex items-center gap-1 px-2 py-2">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group relative rounded-[18px] px-5 py-2.5 text-[15px] font-medium tracking-wide transition-all duration-300 ease-out hover:px-7 hover:py-4 hover:rounded-[24px] hover:scale-[1.0] hover:z-20"
                    style={{ transformOrigin: "center center" }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300"
                      style={{
                        backdropFilter: "blur(3px)",
                        WebkitBackdropFilter: "blur(3px)",
                        filter: "url(#glass-blur)",
                        zIndex: 0,
                      }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300 group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_28px_rgba(0,0,0,0.16)]"
                      style={{
                        boxShadow:
                          "0 4px 4px rgba(0,0,0,0.18), 0 0 14px rgba(0,0,0,0.10)",
                        zIndex: 1,
                      }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300"
                      style={{
                        boxShadow: active
                          ? "inset 3px 3px 3px 0 rgba(45,212,191,0.35), inset -3px -3px 3px 0 rgba(255,255,255,0.30)"
                          : "inset 3px 3px 3px 0 rgba(255,255,255,0.38), inset -3px -3px 3px 0 rgba(255,255,255,0.38)",
                        zIndex: 2,
                      }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                      style={{
                        boxShadow:
                          "0 0 18px 4px rgba(45,212,191,0.45), 0 0 40px 8px rgba(45,212,191,0.18), inset 2px 2px 4px rgba(255,255,255,0.55), inset -2px -2px 4px rgba(45,212,191,0.25)",
                        background:
                          "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.18) 0%, rgba(45,212,191,0.08) 60%, transparent 100%)",
                        zIndex: 3,
                      }}
                    />
                    {active && (
                      <motion.span
                        layoutId="desktop-navbar-pill"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 32,
                        }}
                        className="pointer-events-none absolute inset-0 rounded-[inherit]"
                        style={{
                          background: "rgba(45,212,191,0.18)",
                          boxShadow:
                            "0 0 18px rgba(45,212,191,0.35), inset 0 0 10px rgba(255,255,255,0.12)",
                          zIndex: 4,
                        }}
                      />
                    )}
                    <span
                      className={`relative transition-all duration-300 ${
                        active ? "text-teal-300" : "text-white/80"
                      } group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.9)]`}
                      style={{ position: "relative", zIndex: 10 }}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-3 md:gap-4">
              {!isLoading && (
                <>
                  {!user ? (
                    <>
                      {/* ── LOGIN — pure liquid glass, no colour tint ── */}
                      <Link
                        href="/login"
                        className="group relative hidden sm:flex h-[38px] md:h-11 items-center justify-center overflow-hidden rounded-[14px] md:rounded-[18px] px-5 md:px-6 text-[14px] md:text-[15px] font-medium tracking-wide text-white/80 transition-all duration-300 ease-out hover:px-8 hover:py-3 hover:rounded-[22px] hover:z-20 hover:text-white"
                        style={{ transformOrigin: "center center" }}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300"
                          style={{
                            backdropFilter: "blur(3px)",
                            WebkitBackdropFilter: "blur(3px)",
                            filter: "url(#glass-blur)",
                            zIndex: 0,
                          }}
                        />

                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300 group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.22),0_0_24px_rgba(0,0,0,0.12)]"
                          style={{
                            boxShadow:
                              "0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08)",
                            zIndex: 1,
                          }}
                        />

                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300"
                          style={{
                            boxShadow:
                              "inset 3px 3px 3px rgba(255,255,255,0.38), inset -3px -3px 3px rgba(255,255,255,0.38)",
                            zIndex: 2,
                          }}
                        />

                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "0 0 18px 4px rgba(255,255,255,0.18), 0 0 40px 8px rgba(255,255,255,0.08), inset 2px 2px 4px rgba(255,255,255,0.55), inset -2px -2px 4px rgba(255,255,255,0.20)",
                            background:
                              "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 60%, transparent 100%)",
                            zIndex: 3,
                          }}
                        />

                        <span className="relative" style={{ zIndex: 10 }}>
                          Login
                        </span>
                      </Link>

                      {/* ── REGISTER — same teal solid, glows on hover ── */}
                      <Link
                        href="/signup"
                        className="group relative flex h-[38px] md:h-11 items-center justify-center overflow-hidden rounded-full md:rounded-[18px] bg-teal-400 px-5 md:px-6 text-[14px] md:text-[15px] font-semibold text-black transition-all duration-300 ease-out hover:px-8 hover:py-3 hover:rounded-[22px] hover:scale-[1.0] hover:bg-teal-300"
                        style={{ transformOrigin: "center center" }}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "0 0 22px 6px rgba(45,212,191,0.55), 0 0 50px 10px rgba(45,212,191,0.25), inset 2px 2px 4px rgba(255,255,255,0.50), inset -2px -2px 4px rgba(45,212,191,0.30)",
                            background:
                              "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.28) 0%, rgba(45,212,191,0.10) 60%, transparent 100%)",
                            zIndex: 1,
                          }}
                        />

                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "inset 2px 2px 3px rgba(255,255,255,0.45), inset -2px -2px 3px rgba(255,255,255,0.20)",
                            zIndex: 2,
                          }}
                        />

                        <span
                          className="relative font-semibold"
                          style={{ zIndex: 10 }}
                        >
                          Register
                        </span>
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* CREATE */}
                      <button
                        onClick={() => router.push("/create")}
                        className="group relative flex h-[36px] md:h-11 items-center justify-center overflow-hidden rounded-full md:rounded-[18px] bg-teal-400 px-4 md:px-6 text-[14px] md:text-[15px] font-semibold text-black transition-all duration-300 ease-out hover:px-8 hover:py-3 hover:rounded-[22px] hover:bg-teal-300"
                        style={{ transformOrigin: "center center" }}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "0 0 22px 6px rgba(45,212,191,0.55), 0 0 50px 10px rgba(45,212,191,0.25), inset 2px 2px 4px rgba(255,255,255,0.50), inset -2px -2px 4px rgba(45,212,191,0.30)",
                            background:
                              "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.28) 0%, rgba(45,212,191,0.10) 60%, transparent 100%)",
                            zIndex: 1,
                          }}
                        />

                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "inset 2px 2px 3px rgba(255,255,255,0.45), inset -2px -2px 3px rgba(255,255,255,0.20)",
                            zIndex: 2,
                          }}
                        />

                        <span
                          className="relative font-semibold flex items-center gap-1.5"
                          style={{ zIndex: 10 }}
                        >
                          <span className="text-[16px] font-bold md:hidden leading-none">
                            +
                          </span>
                          <span className="hidden md:inline">Create</span>
                          <span className="md:hidden">Create</span>
                        </span>
                      </button>

                      {/* PROFILE */}
                      <div className="relative" ref={profileRef}>
                        <button
                          onClick={() => setProfileOpen((prev) => !prev)}
                          className="group relative flex h-10 w-10 md:h-11 md:w-11 items-center justify-center overflow-hidden rounded-full text-[13px] md:text-sm font-bold text-teal-300 transition-all duration-500 hover:scale-110"
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full"
                            style={{
                              backdropFilter: "blur(4px)",
                              WebkitBackdropFilter: "blur(4px)",
                              filter: "url(#glass-blur)",
                              zIndex: 0,
                            }}
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full"
                            style={{
                              background: "rgba(255,255,255,0.035)",
                              boxShadow:
                                "0 4px 10px rgba(0,0,0,0.16), 0 0 16px rgba(45,212,191,0.08)",
                              zIndex: 1,
                            }}
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full"
                            style={{
                              boxShadow:
                                "inset 2px 2px 2px rgba(255,255,255,0.34), inset -2px -2px 2px rgba(255,255,255,0.18)",
                              border: "1px solid rgba(255,255,255,0.10)",
                              zIndex: 2,
                            }}
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100"
                            style={{
                              boxShadow:
                                "0 0 22px rgba(45,212,191,0.20), 0 0 48px rgba(45,212,191,0.10)",
                              background:
                                "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), rgba(255,255,255,0.03) 45%, transparent 70%)",
                              zIndex: 3,
                            }}
                          />
                          <span className="relative z-10">
                            {getInitials(displayName)}
                          </span>
                        </button>

                        <AnimatePresence>
                          {profileOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.985 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.985 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="absolute right-0 mt-3 w-60 overflow-hidden rounded-[28px] z-[60]"
                              style={{
                                background: "rgba(12,12,12,0.14)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                transformOrigin: "top right",
                                willChange: "transform, opacity",
                              }}
                            >
                              <div className="relative overflow-hidden rounded-[28px]">
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 rounded-[28px]"
                                  style={{
                                    backdropFilter: "blur(8px)",
                                    WebkitBackdropFilter: "blur(8px)",
                                    filter: "url(#glass-blur)",
                                    opacity: 0.92,
                                    zIndex: 0,
                                  }}
                                />
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 rounded-[28px]"
                                  style={{
                                    background: "rgba(10,10,10,0.18)",
                                    boxShadow:
                                      "0 10px 26px rgba(0,0,0,0.18), 0 0 14px rgba(45,212,191,0.05)",
                                    zIndex: 1,
                                  }}
                                />
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 rounded-[28px]"
                                  style={{
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    boxShadow:
                                      "inset 2px 2px 2px rgba(255,255,255,0.18), inset -2px -2px 2px rgba(255,255,255,0.10)",
                                    zIndex: 2,
                                  }}
                                />
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-x-4 top-0 h-14 rounded-full blur-xl"
                                  style={{
                                    background:
                                      "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.015))",
                                    zIndex: 3,
                                  }}
                                />
                                <div className="relative z-10">
                                  <div className="border-b border-white/8 px-5 py-4">
                                    <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/60">
                                      Logged in as
                                    </p>
                                    <p className="font-semibold text-teal-300 truncate">
                                      {displayName}
                                    </p>
                                  </div>

                                  <div className="p-2">
                                    <Link
                                      href="/blogs"
                                      onClick={() => setProfileOpen(false)}
                                      className="group/menu-item relative flex overflow-hidden rounded-2xl px-4 py-3 text-sm text-white/80 transition-all duration-300 hover:text-white"
                                    >
                                      <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-all duration-300 group-hover/menu-item:opacity-100"
                                        style={{
                                          background: "rgba(255,255,255,0.045)",
                                          boxShadow:
                                            "inset 1px 1px 1px rgba(255,255,255,0.14), inset -1px -1px 1px rgba(255,255,255,0.06)",
                                        }}
                                      />
                                      <span className="relative z-10">
                                        Your Posts
                                      </span>
                                    </Link>

                                    {user?.role &&
                                      ["admin", "superadmin"].includes(
                                        user.role,
                                      ) && (
                                        <Link
                                          href="/admin/blogs"
                                          onClick={() => setProfileOpen(false)}
                                          className="group/menu-item relative flex overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold text-yellow-300 transition-all duration-300 hover:text-yellow-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.35)]"
                                        >
                                          <span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-all duration-300 group-hover/menu-item:opacity-100"
                                            style={{
                                              background:
                                                "rgba(234,179,8,0.16)",
                                              boxShadow:
                                                "0 0 14px rgba(234,179,8,0.18), inset 1px 1px 1px rgba(255,255,255,0.16), inset -1px -1px 1px rgba(255,255,255,0.06)",
                                            }}
                                          />
                                          <span className="relative z-10">
                                            Pending Blogs
                                          </span>
                                        </Link>
                                      )}

                                    <button
                                      onClick={handleChangePassword}
                                      className="group/menu-item relative w-full overflow-hidden rounded-2xl px-4 py-3 text-left text-sm text-white/80 transition-all duration-300 hover:text-white"
                                    >
                                      <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-all duration-300 group-hover/menu-item:opacity-100"
                                        style={{
                                          background: "rgba(255,255,255,0.045)",
                                          boxShadow:
                                            "inset 1px 1px 1px rgba(255,255,255,0.14), inset -1px -1px 1px rgba(255,255,255,0.06)",
                                        }}
                                      />
                                      <span className="relative z-10">
                                        Change Password
                                      </span>
                                    </button>

                                    <button
                                      onClick={handleLogout}
                                      className="group/menu-item relative w-full overflow-hidden rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-400 transition-all duration-300 hover:text-red-200 drop-shadow-[0_0_6px_rgba(248,113,113,0.30)]"
                                    >
                                      <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-all duration-300 group-hover/menu-item:opacity-100"
                                        style={{
                                          background: "rgba(239,68,68,0.16)",
                                          boxShadow:
                                            "0 0 14px rgba(239,68,68,0.15), inset 1px 1px 1px rgba(255,255,255,0.14), inset -1px -1px 1px rgba(255,255,255,0.05)",
                                        }}
                                      />
                                      <span className="relative z-10">
                                        Logout
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── MOBILE NAV ROW (Shows only on small screens) ── */}
          <nav className="md:hidden flex items-center justify-between overflow-x-auto pb-4 gap-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative flex shrink-0 items-center gap-2 rounded-[14px] px-3 py-2.5 text-[14px] transition-all"
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-t-full bg-teal-400 shadow-[0_-2px_8px_rgba(45,212,191,0.6)]"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    size={16}
                    className={active ? "text-teal-300" : "text-white/50"}
                  />
                  <span
                    className={`${
                      active ? "text-teal-300 font-medium" : "text-white/70"
                    }`}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              className="rounded-2xl border border-teal-400/20 bg-black/70 px-6 py-4 text-sm text-teal-300 shadow-2xl backdrop-blur-xl"
            >
              {toast}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <svg
        style={{ display: "none" }}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <filter
          id="glass-blur"
          x="0"
          y="0"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.003 0.007"
            numOctaves="1"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="200"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </>
  );
};

export default Navbar;
