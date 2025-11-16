"use client";

import { motion } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import moment from "moment";
import Link from "next/link";
import type { BlogPost } from "@/lib/types";

/** Builds full Strapi asset URL */
function buildAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_STRAPI_URL || "";
  return `${base}${path}`;
}

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const coverUrl = buildAssetUrl(post.cover?.url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full min-h-screen bg-slate-950 text-gray-200"
    >
      <div className="max-w-3xl mx-auto p-6">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl leading-[60px] text-center font-bold text-teal-400"
        >
          {post.title}
        </motion.h1>

        {/* Published Date */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full flex items-center justify-center font-light text-gray-400 mt-1"
        >
          {post.createdAt
            ? `Published ${moment(post.createdAt).fromNow()}`
            : ""}
        </motion.div>

        {/* Categories */}
        {post.category && post.category.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap space-x-2 my-4 justify-center"
          >
            {post.category.map(({ name, documentId }) => (
              <span
                key={documentId}
                className="border border-teal-800 text-teal-300 px-2 py-1 text-sm rounded bg-teal-950/40 font-medium"
              >
                {name}
              </span>
            ))}
          </motion.div>
        )}

        {/* Cover Image */}
        {coverUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative h-72 w-full my-6"
          >
            <img
              src={coverUrl}
              alt={post.title}
              className="rounded-lg w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Description */}
        {post.description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-gray-400 leading-8 tracking-wide italic mt-2 mb-6 text-center"
          >
            {post.description}
          </motion.p>
        )}

        {/* ------------------------------ */}
        {/*        MARKDOWN CONTENT        */}
        {/* ------------------------------ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="prose prose-invert max-w-none leading-relaxed"
        >
          <Markdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-teal-400 mt-10 mb-4 border-b border-teal-800 pb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-teal-300 mt-8 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-medium text-teal-200 mt-6 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-300 leading-relaxed my-3">{children}</p>
              ),
              code: ({ children }) => (
                <code className="bg-slate-800/70 text-teal-300 px-2 py-1 rounded block my-2 whitespace-pre">
                  {children}
                </code>
              ),

              /** FIX — Blockquotes */
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-teal-500 pl-4 ml-2 italic text-gray-400 my-4">
                  {children}
                </blockquote>
              ),

              /** FIX — Underline (raw HTML) */
              u: ({ children }) => (
                <u className="underline decoration-teal-500">{children}</u>
              ),

              /** FIX — Newlines behave like Strapi */
              text: ({ children }) =>
                String(children).includes("\n")
                  ? String(children)
                      .split("\n")
                      .map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))
                  : children,
            }}
          >
            {post.content || ""}
          </Markdown>
        </motion.div>

        {/* Author Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center justify-center text-gray-400 font-light mb-6 mt-8 text-sm"
        >
          {(post.author?.name || post.writer?.username) && (
            <p>
              Written by{" "}
              <span className="font-medium text-teal-300">
                {post.author?.name || post.writer?.username}
              </span>
              {post.createdAt && <> — {moment(post.createdAt).fromNow()}</>}
            </p>
          )}

          {(post.author?.email || post.writer?.email) && (
            <p className="text-gray-400 mt-1">
              Contact:{" "}
              <span className="font-medium text-teal-500">
                {post.author?.email || post.writer?.email}
              </span>
            </p>
          )}
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="w-full flex justify-center mt-8"
        >
          <Link
            href="/blogs"
            className="text-teal-500 font-medium hover:underline"
          >
            ← Back to Blogs
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
