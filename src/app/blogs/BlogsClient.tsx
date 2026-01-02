"use client";

import { useEffect, useState } from "react";
import type { BlogPost } from "@/lib/types";
import Link from "next/link";
import BlogPagination from "@/components/Pagination";
import { motion } from "framer-motion";

const POSTS_PER_PAGE = 6;

export default function BlogsClient({ blogs }: { blogs: BlogPost[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [myBlogs, setMyBlogs] = useState<BlogPost[] | null>(null);

  // -----------------------------
  // CLIENT FILTERING
  // -----------------------------
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      setMyBlogs([]); // user not logged in
      return;
    }

    const user = JSON.parse(stored);
    const email = user.email;

    const filtered = blogs.filter(
      (b) => b.writer?.email === email || b.author?.email === email
    );

    setMyBlogs(filtered);
  }, [blogs]);

  // -----------------------------
  // LOADING WHILE CHECKING USER
  // -----------------------------
  if (myBlogs === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
        Loading your blogs...
      </div>
    );
  }

  // -----------------------------
  // NOT LOGGED IN
  // -----------------------------
  if (myBlogs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-gray-400">
        <p className="text-xl mb-4">
          You must be logged in to view your blogs.
        </p>
        <Link
          href="/login"
          className="bg-teal-500 px-4 py-2 rounded-md text-gray-900 font-semibold hover:bg-teal-400"
        >
          Login
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(myBlogs.length / POSTS_PER_PAGE);
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE;
  const currentBlogs = myBlogs.slice(startIdx, startIdx + POSTS_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-teal-400">Your Blogs</h1>

        <Link
          href="/create"
          className="bg-teal-500 text-gray-900 font-semibold px-4 py-2 rounded-md hover:bg-teal-400 transition-all"
        >
          + Create Blog
        </Link>
      </div>

      {/* Blog Grid */}
      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentBlogs.map((blog, i) => {
          const coverUrl = blog.cover?.url
            ? blog.cover.url.startsWith("http")
              ? blog.cover.url
              : `${process.env.NEXT_PUBLIC_STRAPI_URL}${blog.cover.url}`
            : null;

          return (
            <motion.div
              key={blog.documentId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="group block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:scale-[1.02] hover:border-teal-500 transition-all duration-300">
                {/* COVER */}
                {coverUrl && (
                  <div className="w-full h-48 overflow-hidden rounded-lg mb-4">
                    <img
                      src={coverUrl}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* TITLE */}
                <h2 className="text-xl font-semibold text-white mb-2 line-clamp-2 group-hover:text-teal-400 transition-colors">
                  {blog.title}
                </h2>

                {/* DESCRIPTION */}
                <p className="text-gray-400 text-sm line-clamp-3 mb-3">
                  {blog.description || "No description."}
                </p>

                {/* FOOTER META */}
                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <span>{blog.writer?.username || blog.author?.name}</span>
                  <span>
                    {blog.createdAt
                      ? new Date(blog.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-between mt-4">
                  <Link
                    href={`/blogs/${blog.documentId}`}
                    className="px-3 py-1 text-sm bg-slate-800 border border-gray-600 rounded hover:bg-slate-700 transition"
                  >
                    View
                  </Link>

                  <Link
                    href={`/blogs/${blog.documentId}/edit`}
                    className="px-3 py-1 text-sm bg-teal-500 text-black font-semibold rounded hover:bg-teal-400 transition"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto mt-12">
          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/blogs"
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </motion.div>
  );
}
