"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BlogPagination from "@/components/Pagination";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const POSTS_PER_PAGE = 6;

interface Blog {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  categories: string[];
  coverImage?: string;
  status: "draft" | "pending" | "approved" | "rejected" | "published";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  // ✅ New field
  deletionRequested?: boolean;
}

export default function BlogsClient() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [blogs, setBlogs] = useState<Blog[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch("/api/blogs/my-blogs");
        if (res.ok) {
          const data = await res.json();
          setBlogs(data.blogs || []);
        } else {
          setBlogs([]);
        }
      } catch (err) {
        console.error("Failed to fetch blogs:", err);
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Delete Handler
  const handleDelete = async (e: React.MouseEvent, blog: Blog) => {
    // Prevent the parent onClick (navigation) from firing
    e.stopPropagation();

    const isPublished =
      blog.status === "published" || blog.status === "approved";
    const confirmMessage = isPublished
      ? "This blog is published. Do you want to send a request to the Admin to delete it?"
      : "Are you sure you want to delete this blog?";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch(`/api/blogs/${blog._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        if (data.action === "requested") {
          toast.success("Deletion request sent to Admin");
          // Update local state to reflect request
          setBlogs((prev) =>
            prev
              ? prev.map((b) =>
                  b._id === blog._id ? { ...b, deletionRequested: true } : b,
                )
              : [],
          );
        } else {
          toast.success("Blog deleted successfully");
          // Remove locally to avoid refetch
          setBlogs((prev) =>
            prev ? prev.filter((b) => b._id !== blog._id) : [],
          );
        }
      } else {
        toast.error(data.error || "Failed to delete blog");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete blog");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
        Loading your blogs...
      </div>
    );
  }

  if (!blogs || blogs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-gray-400">
        <p className="text-xl mb-4">You haven't created any blogs yet.</p>
        <Link
          href="/create"
          className="bg-teal-500 px-6 py-3 rounded-md text-gray-900 font-semibold hover:bg-teal-400"
        >
          Create Your First Blog
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(blogs.length / POSTS_PER_PAGE);
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE;
  const currentBlogs = blogs.slice(startIdx, startIdx + POSTS_PER_PAGE);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500/20 text-green-400 border-green-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
      case "approved":
        return "bg-blue-500/20 text-blue-400 border-blue-500";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500";
    }
  };

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
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentBlogs.map((blog, i) => (
          <motion.div
            key={blog._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {/* Make entire card clickable */}
            <div
              onClick={() => {
                // If published, go to Strapi blog, else go to MongoDB preview
                if (blog.status === "published") {
                  router.push(`/blogs/${blog.slug}`);
                } else {
                  router.push(`/blogs/my/${blog._id}`);
                }
              }}
              className="group block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:scale-[1.02] hover:border-teal-500 transition-all duration-300 cursor-pointer relative"
            >
              {/* DELETE BUTTON (Visible for All Statuses) */}
              <button
                onClick={(e) => handleDelete(e, blog)}
                className={`absolute top-3 right-3 z-20 p-2 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg ${
                  blog.deletionRequested
                    ? "bg-yellow-600/80 hover:bg-yellow-700 cursor-default"
                    : "bg-red-500/80 hover:bg-red-600"
                }`}
                title={
                  blog.deletionRequested ? "Deletion Requested" : "Delete Blog"
                }
                disabled={!!blog.deletionRequested}
              >
                {blog.deletionRequested ? (
                  // Clock Icon for pending request
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  // Trash Icon
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>

              {/* COVER IMAGE */}
              {blog.coverImage ? (
                <div className="relative w-full h-48 bg-gray-800">
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              <div className="p-5">
                {/* STATUS BADGE */}
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`text-xs px-2 py-1 rounded border ${getStatusColor(
                      blog.status,
                    )}`}
                  >
                    {blog.status.toUpperCase()}
                  </span>
                  {blog.deletionRequested && (
                    <span className="text-[10px] text-yellow-500 font-medium bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30">
                      Deletion Requested
                    </span>
                  )}
                </div>

                {/* TITLE */}
                <h2 className="text-xl font-semibold text-white mb-2 line-clamp-2 group-hover:text-teal-400 transition-colors">
                  {blog.title}
                </h2>

                {/* DESCRIPTION */}
                <p className="text-gray-400 text-sm line-clamp-3 mb-3">
                  {blog.description || "No description."}
                </p>

                {/* CATEGORIES */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {blog.categories && blog.categories.length > 0 ? (
                    blog.categories.map((cat, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 border border-teal-500 rounded"
                      >
                        {cat}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No categories</span>
                  )}
                </div>

                {/* DATE */}
                <div className="text-sm text-gray-500 mb-3">
                  {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>

                {/* STATUS MESSAGE */}
                <div className="text-sm text-gray-500">
                  {blog.status === "published" &&
                    "Click to view published blog"}
                  {blog.status === "pending" &&
                    "Awaiting Review - Click to preview"}
                  {blog.status === "rejected" &&
                    (blog.adminNotes
                      ? "Rejected - Click to view reason"
                      : "Rejected")}
                  {blog.status === "approved" && "Approved - Publishing Soon"}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
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
