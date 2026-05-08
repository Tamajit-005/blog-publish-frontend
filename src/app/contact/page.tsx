"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Clock3,
  MapPin,
  MessageCircle,
  ArrowRight,
  Send,
  Info,
} from "lucide-react";

export default function ContactPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user/username");

        if (res.ok) {
          const data = await res.json();
          setUser({
            username: data.username,
            email: data.email,
          });
          setName(data.username || "");
          setEmail(data.email || "");
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSuccess(true);
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to send message!");
    } finally {
      setLoading(false);
    }
  };

  const contactNotes = [
    {
      icon: Mail,
      title: "Email Us",
      text: "tamajitsaha05@gmail.com",
    },
    {
      icon: Clock3,
      title: "Response Time",
      text: "We typically respond within 24 hours.",
    },
    {
      icon: MapPin,
      title: "Location",
      text: "Working from the cloud · Serving creators worldwide.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <main className="relative min-h-screen overflow-hidden bg-[#04070c] text-white">
        {/* BACKGROUND IMAGE - Locked height for mobile stability */}
        <div className="fixed left-0 top-0 z-0 h-[100svh] w-full pointer-events-none">
          <Image
            src="/images/hero-bg.jpg"
            alt="Palette Publisher background"
            fill
            priority
            className="h-full w-full object-cover object-[60%_top] sm:object-top"
          />

          {/* DARKENING LAYERS */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,0.96)_0%,rgba(3,5,10,0.94)_28%,rgba(3,5,10,0.82)_45%,rgba(3,5,10,0.40)_65%,rgba(3,5,10,0.45)_80%,rgba(3,5,10,0.75)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(45,212,191,0.06),transparent_20%)]" />
          <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-[#02050a] via-[#02050a]/80 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#02050a] via-[#02050a]/90 to-transparent" />
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-20 pt-32 sm:px-6 md:px-8 lg:px-12 lg:pt-40">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.08fr)] lg:items-start lg:gap-12">
            {/* LEFT COLUMN */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="order-1 max-w-[640px] lg:sticky lg:top-32 lg:self-start"
            >
              {/* HIDDEN ON MOBILE: hidden sm:inline-flex */}
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-teal-400/18 bg-teal-400/[0.05] px-4 py-2 text-[14px] text-teal-300 shadow-[0_0_18px_rgba(45,212,191,0.08)] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.95)]" />
                <span>We&apos;d love to hear from you</span>
              </div>

              <div className="mt-7">
                <h1 className="max-w-[11ch] text-[clamp(3rem,6vw,5.2rem)] font-black leading-[0.92] tracking-tight text-white">
                  Let&apos;s Start a
                  <span className="mt-1 block text-teal-400 drop-shadow-[0_0_18px_rgba(45,212,191,0.22)]">
                    Conversation
                  </span>
                </h1>

                <p className="mt-7 max-w-[26rem] text-[clamp(1.02rem,1.15vw,1.2rem)] leading-8 text-white/78">
                  Have a question, feedback, or just want to say hello?
                  We&apos;re here for you. Reach out and we&apos;ll get back to
                  you as soon as possible.
                </p>
              </div>

              <div className="mt-10 space-y-6">
                {contactNotes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-teal-400/12 bg-black/35 shadow-[inset_0_0_12px_rgba(45,212,191,0.06),0_0_16px_rgba(45,212,191,0.08)] backdrop-blur-md">
                        <Icon
                          size={26}
                          className="text-teal-300 drop-shadow-[0_0_10px_rgba(45,212,191,0.28)]"
                          strokeWidth={1.8}
                        />
                      </div>
                      <div className="pt-1">
                        <h2 className="text-[1.05rem] font-semibold text-teal-300">
                          {item.title}
                        </h2>
                        <p className="mt-1.5 max-w-[18rem] text-[1rem] leading-7 text-white/80">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>

            {/* RIGHT COLUMN */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.72,
                delay: 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="order-2"
            >
              <div className="rounded-[28px] border border-white/8 bg-white/[0.02] p-5 shadow-[0_0_40px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-7 lg:p-8">
                {/* INFO BOX */}
                <div className="rounded-[22px] border border-teal-400/20 bg-teal-400/[0.03] p-4 shadow-[0_0_18px_rgba(45,212,191,0.06)] sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-400 text-slate-950 shadow-[0_0_18px_rgba(45,212,191,0.2)]">
                      <span className="flex items-center justify-center">
                        <Info size={18} strokeWidth={2.5} />
                      </span>
                    </div>
                    <p className="text-[0.98rem] leading-7 text-white/88 sm:text-[1.03rem]">
                      Your message will be sent from{" "}
                      <span className="font-semibold text-teal-300">
                        {email || "your registered email"}
                      </span>
                      . We&apos;ll reply to this email address.
                    </p>
                  </div>
                </div>

                {/* FORM / LOGIN */}
                {!user && !isLoading ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Link
                      href={`/login?returnTo=${encodeURIComponent("/contact")}`}
                      className="flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-400 px-5 text-[1.02rem] font-semibold text-slate-950 shadow-[0_0_20px_rgba(45,212,191,0.18)] transition hover:brightness-110"
                    >
                      Login
                    </Link>
                    <Link
                      href={`/signup?returnTo=${encodeURIComponent("/contact")}`}
                      className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-[1.02rem] font-semibold text-white/86 shadow-[0_0_18px_rgba(255,255,255,0.04)] transition hover:bg-white/[0.05]"
                    >
                      Register
                    </Link>
                  </div>
                ) : user ? (
                  <form onSubmit={handleSubmit} className="mt-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        className="h-14 w-full rounded-2xl border border-white/6 bg-[#101522] px-5 text-[1rem] text-white placeholder:text-white/35 outline-none transition focus:border-teal-400/35 focus:ring-2 focus:ring-teal-400/12"
                      />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="h-14 w-full cursor-not-allowed rounded-2xl border border-white/6 bg-[#101522] px-5 text-[1rem] text-white/45 outline-none"
                      />
                    </div>

                    <textarea
                      placeholder="Your Message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      minLength={10}
                      maxLength={5000}
                      className="mt-4 w-full rounded-2xl border border-white/6 bg-[#101522] px-5 py-4 text-[1rem] text-white placeholder:text-white/35 outline-none transition focus:border-teal-400/35 focus:ring-2 focus:ring-teal-400/12 min-h-[180px] resize-y"
                    />

                    {/* ANIMATED SUCCESS MESSAGE */}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-emerald-300"
                      >
                        <span className="mt-0.5 text-lg">✅</span>
                        <span className="text-[0.98rem] leading-7">
                          Message sent successfully! We&apos;ll get back to you
                          at <strong>{email}</strong> soon.
                        </span>
                      </motion.div>
                    )}

                    {/* ANIMATED ERROR MESSAGE */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-400/[0.06] p-4 text-red-300"
                      >
                        <span className="mt-0.5 text-lg">❌</span>
                        <span className="text-[0.98rem] leading-7">
                          {error}
                        </span>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-400 px-5 text-[1.05rem] font-bold text-slate-950 shadow-[0_0_24px_rgba(45,212,191,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{loading ? "Sending..." : "Send Message"}</span>
                      <Send size={20} />
                    </button>
                  </form>
                ) : null}
              </div>
            </motion.section>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
