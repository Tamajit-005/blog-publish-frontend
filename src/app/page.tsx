"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import CinematicLoader from "@/components/CinematicLoader";
import SecondaryLoader from "@/components/SecondaryLoader"; // Added import

type UserInfo = {
  username: string;
  role?: "user" | "admin" | "superadmin";
};

function GlassButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center justify-center overflow-hidden rounded-2xl px-8 py-4 font-semibold text-white transition-all duration-300 ease-out hover:px-10 hover:rounded-3xl"
      style={{
        transformOrigin: "center center",
        backgroundColor: "rgba(2,5,10,0.1)", // dark watery base
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow:
          "0 8px 24px rgba(0,0,0,0.40), 0 0 24px rgba(45,212,191,0.10), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -1px 1px rgba(255,255,255,0.02)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        willChange: "transform, opacity",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(45,212,191,0.04), transparent 60%)",
          zIndex: 0,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 15%)",
          zIndex: 1,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(45,212,191,0.08) 0%, transparent 70%)",
          boxShadow:
            "inset 0 0 12px rgba(45,212,191,0.15), inset 0 1px 2px rgba(255,255,255,0.2)",
          zIndex: 2,
        }}
      />
      <span
        className="relative z-10"
        style={{
          textShadow: "0 1px 8px rgba(0,0,0,0.22)",
        }}
      >
        {children}
      </span>
    </Link>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [bgReady, setBgReady] = useState(false);

  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    fetch("/api/user/username")
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.src = "/images/hero-bg.webp";

    if (img.complete) {
      setBgReady(true);
      return;
    }

    img.onload = () => setBgReady(true);
    img.onerror = () => setBgReady(true);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, []);

  useEffect(() => {
    const alreadyVisited =
      sessionStorage.getItem("home-loader-shown") === "true";

    setIsFirstVisit(!alreadyVisited);
    setSessionChecked(true);

    if (!alreadyVisited) {
      const timer = setTimeout(() => {
        sessionStorage.setItem("home-loader-shown", "true");
        setIntroDone(true);
      }, 3200);

      return () => clearTimeout(timer);
    } else {
      setIntroDone(true);
    }
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const pageReady = !loadingUser && bgReady;

  const showLoader = useMemo(() => {
    if (!sessionChecked) return true;
    if (isFirstVisit) return !introDone;
    return !pageReady;
  }, [sessionChecked, isFirstVisit, introDone, pageReady]);

  return (
    <>
      <AnimatePresence>
        {showLoader &&
          // Choice logic: If cold entry -> Cinematic. If navigation -> Secondary.
          (isFirstVisit ? <CinematicLoader /> : <SecondaryLoader />)}
      </AnimatePresence>

      <motion.main
        initial={{
          opacity: 0,
          scale: 1.04,
          filter: "blur(16px)",
        }}
        animate={{
          opacity: 1,
          scale: showLoader ? 1.04 : 1,
          filter: showLoader ? "blur(16px)" : "blur(0px)",
        }}
        transition={{
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative min-h-screen overflow-hidden bg-black text-white"
      >
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.webp"
            alt="Background"
            className="h-full w-full object-cover object-[60%_center] sm:object-center"
          />
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:32px_32px]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: showLoader ? 0 : 1,
                y: showLoader ? 20 : 0,
              }}
              transition={{
                delay: 0.3,
                duration: 0.8,
              }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-5 py-2"
            >
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-sm tracking-wide text-teal-300">
                Your Voice. Your Story. Your World.
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{
                opacity: showLoader ? 0 : 1,
                y: showLoader ? 50 : 0,
              }}
              transition={{
                delay: 0.5,
                duration: 1,
              }}
              className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
            >
              {user ? (
                <>
                  Welcome back,
                  <br />
                  <span className="text-teal-400">{user.username}</span>
                </>
              ) : (
                <>
                  Write without
                  <br />
                  limits.
                  <br />
                  Publish with <span className="text-teal-400">purpose.</span>
                </>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{
                opacity: showLoader ? 0 : 1,
                y: showLoader ? 30 : 0,
              }}
              transition={{
                delay: 0.8,
                duration: 0.9,
              }}
              className="mt-8 max-w-xl text-lg leading-relaxed text-gray-300 md:text-xl"
            >
              {user ? (
                <>
                  Manage your blogs, track approvals, edit stories, and continue
                  building your creative universe.
                </>
              ) : (
                <>
                  A modern publishing platform for creators, storytellers, and
                  dreamers. Beautifully simple. Powerfully yours.
                </>
              )}
            </motion.p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              {!loadingUser && (
                <>
                  {!user && (
                    <>
                      <motion.div
                        initial={false}
                        animate={{
                          opacity: showLoader ? 0 : 1,
                          y: showLoader ? 30 : 0,
                        }}
                        transition={{
                          delay: 1,
                          duration: 0.8,
                        }}
                      >
                        <Link
                          href="/blogs"
                          className="group relative flex items-center justify-center overflow-hidden rounded-2xl bg-teal-500 px-8 py-4 font-semibold text-slate-900 transition-all duration-300 ease-out hover:px-10 hover:rounded-3xl hover:bg-teal-400"
                          style={{ transformOrigin: "center center" }}
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                            style={{
                              boxShadow:
                                "0 0 28px 8px rgba(20,184,166,0.60), 0 0 60px 14px rgba(20,184,166,0.28), inset 3px 3px 6px rgba(255,255,255,0.50), inset -3px -3px 6px rgba(20,184,166,0.35)",
                              background:
                                "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.32) 0%, rgba(20,184,166,0.12) 60%, transparent 100%)",
                              zIndex: 1,
                            }}
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                            style={{
                              boxShadow:
                                "inset 3px 3px 4px rgba(255,255,255,0.50), inset -3px -3px 4px rgba(255,255,255,0.25)",
                              zIndex: 2,
                            }}
                          />
                          <span
                            className="relative font-semibold"
                            style={{ zIndex: 10 }}
                          >
                            Explore Blogs
                          </span>
                        </Link>
                      </motion.div>

                      <motion.div
                        initial={false}
                        animate={{
                          opacity: showLoader ? 0 : 1,
                          y: showLoader ? 30 : 0,
                        }}
                        transition={{
                          delay: 1.08,
                          duration: 0.8,
                        }}
                      >
                        <GlassButton href="/login">
                          Login to Publish
                        </GlassButton>
                      </motion.div>
                    </>
                  )}

                  {user && (
                    <>
                      <motion.div
                        initial={false}
                        animate={{
                          opacity: showLoader ? 0 : 1,
                          y: showLoader ? 30 : 0,
                        }}
                        transition={{
                          delay: 1,
                          duration: 0.8,
                        }}
                      >
                        <Link
                          href="/create"
                          className="group relative flex items-center justify-center overflow-hidden rounded-2xl bg-teal-500 px-8 py-4 font-semibold text-slate-900 transition-all duration-300 ease-out hover:px-10 hover:rounded-3xl hover:bg-teal-400"
                          style={{ transformOrigin: "center center" }}
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                            style={{
                              boxShadow:
                                "0 0 28px 8px rgba(20,184,166,0.60), 0 0 60px 14px rgba(20,184,166,0.28), inset 3px 3px 6px rgba(255,255,255,0.50), inset -3px -3px 6px rgba(20,184,166,0.35)",
                              background:
                                "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.32) 0%, rgba(20,184,166,0.12) 60%, transparent 100%)",
                              zIndex: 1,
                            }}
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                            style={{
                              boxShadow:
                                "inset 3px 3px 4px rgba(255,255,255,0.50), inset -3px -3px 4px rgba(255,255,255,0.25)",
                              zIndex: 2,
                            }}
                          />
                          <span
                            className="relative font-semibold"
                            style={{ zIndex: 10 }}
                          >
                            Create Blog
                          </span>
                        </Link>
                      </motion.div>

                      <motion.div
                        initial={false}
                        animate={{
                          opacity: showLoader ? 0 : 1,
                          y: showLoader ? 30 : 0,
                        }}
                        transition={{
                          delay: 1.08,
                          duration: 0.8,
                        }}
                      >
                        <GlassButton href="/blogs">Your Blogs</GlassButton>
                      </motion.div>
                    </>
                  )}

                  {isAdmin && (
                    <motion.div
                      initial={false}
                      animate={{
                        opacity: showLoader ? 0 : 1,
                        y: showLoader ? 30 : 0,
                      }}
                      transition={{
                        delay: 1.16,
                        duration: 0.8,
                      }}
                    >
                      <Link
                        href="/admin/blogs"
                        className="group relative flex items-center justify-center overflow-hidden rounded-2xl bg-yellow-500 px-8 py-4 font-semibold text-black transition-all duration-300 ease-out hover:px-10 hover:rounded-3xl hover:bg-yellow-400"
                        style={{ transformOrigin: "center center" }}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "0 0 28px 8px rgba(234,179,8,0.55), 0 0 60px 14px rgba(234,179,8,0.25), inset 3px 3px 6px rgba(255,255,255,0.48), inset -3px -3px 6px rgba(234,179,8,0.32)",
                            background:
                              "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(234,179,8,0.10) 60%, transparent 100%)",
                            zIndex: 1,
                          }}
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow:
                              "inset 3px 3px 4px rgba(255,255,255,0.48), inset -3px -3px 4px rgba(255,255,255,0.20)",
                            zIndex: 2,
                          }}
                        />
                        <span
                          className="relative font-semibold"
                          style={{ zIndex: 10 }}
                        >
                          Pending Blogs
                        </span>
                      </Link>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.main>
    </>
  );
}
