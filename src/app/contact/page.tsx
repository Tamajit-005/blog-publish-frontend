"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import emailjs from "@emailjs/browser";
import { FaTwitter, FaGithub, FaInstagram } from "react-icons/fa";
import { motion } from "framer-motion";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await emailjs.send(
        "service_2z2imqp",
        "template_09fvxyn",
        { name, email, message },
        "7ieLAwg5IFgkJqt-M"
      );

      toast.success("Message sent!");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast.error("Failed to send message!");
    } finally {
      setLoading(false);
    }
  };

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
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="p-3 rounded-md bg-slate-800 text-gray-100 placeholder-gray-500 
            focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          />

          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-3 rounded-md bg-slate-800 text-gray-100 placeholder-gray-500 
            focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          />

          <textarea
            placeholder="Your Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            className="p-3 rounded-md bg-slate-800 text-gray-100 placeholder-gray-500 
            focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-6 py-3 rounded-md transition disabled:opacity-50"
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
              className="text-gray-400 hover:text-teal-400 transition"
            >
              <FaTwitter size={22} />
            </a>

            <a
              href="https://github.com/Tamajit-005"
              target="_blank"
              className="text-gray-400 hover:text-teal-400 transition"
            >
              <FaGithub size={22} />
            </a>

            <a
              href="https://www.instagram.com/tamajit005/"
              target="_blank"
              className="text-gray-400 hover:text-teal-400 transition"
            >
              <FaInstagram size={22} />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
