"use client";

import { useState, useEffect } from "react";
import { FaTwitter, FaGithub, FaInstagram } from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ContactPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication and fetch user data
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
          // User not logged in
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

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-teal-400 text-xl">Loading...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full min-h-screen bg-slate-950 text-gray-300 py-12 px-4"
      >
        <div className="max-w-3xl mx-auto bg-gray-900 rounded-lg shadow-lg p-6 md:p-10">
          <h1 className="text-4xl font-bold text-teal-500 mb-6 text-center">
            Contact Us
          </h1>

          <div className="bg-yellow-500/10 border-2 border-yellow-500 text-yellow-300 p-8 rounded-lg mb-6">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-3xl">🔒</span>
              <div>
                <p className="text-xl font-semibold mb-3">
                  Please Login or Register First
                </p>
                <p className="text-gray-300 mb-2 leading-relaxed">
                  To send us a message, you must be logged in with the email
                  address you want to use for communication.
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Your message will be sent from your registered email address,
                  and we'll reply to that same email.
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-6">
              <Link
                href={`/login?returnTo=${encodeURIComponent("/contact")}`}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-8 py-3 rounded-md transition shadow-md"
              >
                Login
              </Link>
              <Link
                href={`/signup?returnTo=${encodeURIComponent("/contact")}`}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-md transition shadow-md"
              >
                Register
              </Link>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-teal-400 mb-3">
              💡 Why do I need to login?
            </h2>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                <span>We verify your identity to prevent spam and abuse</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                <span>
                  Your message will be sent from your registered email
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                <span>
                  We can track your conversation and reply to the correct
                  address
                </span>
              </li>
            </ul>
          </div>

          <p className="text-gray-400 text-center mb-4">
            Or email us directly at{" "}
            <a
              href="mailto:tamajitsaha05@gmail.com"
              className="text-teal-400 underline hover:text-teal-300 transition"
            >
              tamajitsaha05@gmail.com
            </a>
          </p>

          <div className="mt-10 text-center">
            <h2 className="text-xl font-semibold mb-3 text-teal-400">
              Follow us:
            </h2>
            <div className="flex justify-center gap-6">
              <a
                href="https://x.com/tamajitsaha05"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-teal-400 transition"
                aria-label="Twitter"
              >
                <FaTwitter size={22} />
              </a>
              <a
                href="https://github.com/Tamajit-005"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-teal-400 transition"
                aria-label="GitHub"
              >
                <FaGithub size={22} />
              </a>
              <a
                href="https://www.instagram.com/tamajit005/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-teal-400 transition"
                aria-label="Instagram"
              >
                <FaInstagram size={22} />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show contact form for authenticated users
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full min-h-screen bg-slate-950 text-gray-300 py-12 px-4"
    >
      <div className="max-w-3xl mx-auto bg-gray-900 rounded-lg shadow-lg p-6 md:p-10">
        <h1 className="text-4xl font-bold text-teal-500 mb-6 text-center">
          Contact Us
        </h1>

        <div className="bg-teal-500/10 border border-teal-500 text-teal-300 p-4 rounded-md mb-6">
          <p className="text-sm flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <span>
              Your message will be sent from <strong>{email}</strong>. We'll
              reply to this email address.
            </span>
          </p>
        </div>

        <p className="text-gray-400 mb-8 text-center">
          Have a question or want to collaborate? Fill out the form below or
          email us at{" "}
          <a
            href="mailto:tamajitsaha05@gmail.com"
            className="text-teal-400 underline hover:text-teal-300 transition"
          >
            tamajitsaha05@gmail.com
          </a>
          .
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <input
              type="text"
              placeholder="Your Username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              className="w-full p-3 rounded-md bg-slate-800 text-gray-100 placeholder-gray-500 
              focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
          </div>

          <div className="relative">
            <input
              type="email"
              value={email}
              readOnly
              className="w-full p-3 rounded-md bg-slate-700 text-gray-400 cursor-not-allowed
              border border-slate-600"
            />
            <span className="absolute right-3 top-3 text-xs text-gray-500">
              🔒 Locked
            </span>
          </div>

          <textarea
            placeholder="Your Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            className="p-3 rounded-md bg-slate-800 text-gray-100 placeholder-gray-500 
            focus:outline-none focus:ring-2 focus:ring-teal-500 transition resize-vertical"
          />

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-400 p-4 rounded-md flex items-start gap-3">
              <span className="text-xl">✅</span>
              <span className="flex-1">
                Message sent successfully! We'll get back to you at{" "}
                <strong>{email}</strong> soon.
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-md flex items-start gap-3">
              <span className="text-xl">❌</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-6 py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>

        <div className="mt-10 text-center">
          <h2 className="text-xl font-semibold mb-3 text-teal-400">
            Follow us:
          </h2>

          <div className="flex justify-center gap-6">
            <a
              href="https://x.com/tamajitsaha05"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-teal-400 transition"
              aria-label="Twitter"
            >
              <FaTwitter size={22} />
            </a>

            <a
              href="https://github.com/Tamajit-005"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-teal-400 transition"
              aria-label="GitHub"
            >
              <FaGithub size={22} />
            </a>

            <a
              href="https://www.instagram.com/tamajit005/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-teal-400 transition"
              aria-label="Instagram"
            >
              <FaInstagram size={22} />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
