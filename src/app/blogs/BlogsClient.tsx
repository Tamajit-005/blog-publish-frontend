"use client";

import { useState } from "react";
import type { BlogPost } from "@/lib/types";
import Link from "next/link";
import BlogPagination from "@/components/Pagination";
import Loader from "@/components/Loader";
import { motion } from "framer-motion";

const POSTS_PER_PAGE = 6;

export default function BlogsClient({ blogs }: { blogs: BlogPost[] }) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!blogs || blogs.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
        No blogs found.
      </div>
    );

  const totalPages = Math.ceil(blogs.length / POSTS_PER_PAGE);
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE;
  const currentBlogs = blogs.slice(startIdx, startIdx + POSTS_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-teal-400"
        >
          All Blogs
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/create"
            className="bg-teal-500 text-gray-900 font-semibold px-4 py-2 rounded-md hover:bg-teal-400 transition-all"
          >
            + Create Blog
          </Link>
        </motion.div>
      </div>

      {/* Blog Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {currentBlogs.map((blog, i) => {
          const coverUrl = blog.cover?.url
            ? blog.cover.url.startsWith("http")
              ? blog.cover.url
              : `${process.env.NEXT_PUBLIC_STRAPI_URL}${blog.cover.url}`
            : null;

          return (
            <motion.div
              key={blog.documentId}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.3 }}
            >
              <Link
                href={`/blogs/${blog.documentId}`}
                className="group block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:scale-[1.02] hover:border-teal-500 transition-all duration-300"
              >
                {coverUrl && (
                  <div className="w-full h-48 overflow-hidden rounded-lg mb-4">
                    <img
                      src={coverUrl}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <h2 className="text-xl font-semibold text-white mb-2 line-clamp-2 group-hover:text-teal-400 transition-colors">
                  {blog.title}
                </h2>

                <p className="text-gray-400 text-sm line-clamp-3 mb-3">
                  {blog.description || "No description available."}
                </p>

                <div className="flex justify-between text-sm text-gray-500 mt-auto">
                  <p>{blog.author?.name || "Unknown Author"}</p>
                  <p>
                    {blog.createdAt
                      ? new Date(blog.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-7xl mx-auto mt-12"
        >
          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/blogs"
            onPageChange={setCurrentPage}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
