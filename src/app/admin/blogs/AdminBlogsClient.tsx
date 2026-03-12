"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  categories: string[];
  coverImage?: string;
  author: {
    username: string;
    email: string;
  };
  status: string;
  createdAt: string;
  deletionRequested?: boolean;
}

export default function AdminBlogsClient() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "deletion">("pending");

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingBlogs();
    } else {
      fetchDeletionRequests();
    }
  }, [activeTab]);

  async function fetchPendingBlogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs/pending");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      } else {
        setError("Failed to fetch pending blogs");
      }
    } catch (err) {
      setError("Failed to fetch blogs");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeletionRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs/delete-requests");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      } else {
        setError("Failed to fetch deletion requests");
      }
    } catch (err) {
      setError("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to approve and publish this blog?"))
      return;

    try {
      const res = await fetch("/api/admin/blogs/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId }),
      });

      if (res.ok) {
        alert("✅ Blog approved and published to Strapi!");
        fetchPendingBlogs();
      } else {
        const data = await res.json();
        alert(`❌ ${data.error}`);
      }
    } catch (err) {
      alert("Failed to approve blog");
    }
  }

  async function handleReject(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    const reason = prompt("Reason for rejection:");
    if (!reason) return;

    try {
      const res = await fetch("/api/admin/blogs/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId, adminNotes: reason }),
      });

      if (res.ok) {
        alert("✅ Blog rejected");
        fetchPendingBlogs();
      } else {
        const data = await res.json();
        alert(`❌ ${data.error}`);
      }
    } catch (err) {
      alert("Failed to reject blog");
    }
  }

  async function handleApproveDelete(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure? This will permanently delete the blog from Strapi and Database.",
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/blogs/approve-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId }),
      });

      if (res.ok) {
        alert("✅ Blog permanently deleted");
        fetchDeletionRequests();
      } else {
        const data = await res.json();
        alert(`❌ ${data.error}`);
      }
    } catch (err) {
      alert("Failed to delete blog");
    }
  }

  async function handleRejectDelete(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    alert(
      "Functionality to reject deletion request (keep blog live) can be implemented here by setting deletionRequested to false.",
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-teal-400">Admin Dashboard</h1>

          {/* TABS */}
          <div className="flex space-x-2 bg-gray-900 p-1 rounded-lg">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "pending"
                  ? "bg-teal-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Pending Approvals
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("deletion")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "deletion"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Deletion Requests
            </motion.button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64 text-teal-400"
            >
              Loading...
            </motion.div>
          ) : blogs.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 text-center mt-20 text-lg"
            >
              {activeTab === "pending"
                ? "No pending blogs."
                : "No deletion requests."}
            </motion.p>
          ) : (
            <motion.div key="list" className="space-y-6">
              {blogs.map((blog, index) => (
                <motion.div
                  key={blog._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }} // Staggered entry
                  whileHover={{ scale: 1.015 }} // Smooth scaling on hover
                  onClick={() => router.push(`/admin/blogs/${blog._id}`)}
                  className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-teal-500 transition-colors cursor-pointer shadow-lg"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* COVER IMAGE */}
                    <div className="md:w-80 w-full h-64 md:h-auto flex-shrink-0">
                      {blog.coverImage ? (
                        <img
                          src={blog.coverImage}
                          alt={blog.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <svg
                            className="w-20 h-20 text-gray-700"
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
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-semibold text-white mb-2">
                          {blog.title}
                        </h2>
                        {activeTab === "deletion" && (
                          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded border border-red-500/50">
                            Deletion Requested
                          </span>
                        )}
                      </div>

                      <p className="text-gray-400 mb-4 line-clamp-2">
                        {blog.description || "No description"}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        <span>
                          By:{" "}
                          <strong className="text-teal-400">
                            {blog.author.username}
                          </strong>
                        </span>
                        <span>
                          Slug: <strong>{blog.slug}</strong>
                        </span>
                        <span>
                          {new Date(blog.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>

                      {/* CATEGORIES */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {blog.categories && blog.categories.length > 0 ? (
                          blog.categories.map((cat, catIndex) => (
                            <span
                              key={catIndex}
                              className="text-xs px-3 py-1 bg-teal-500/20 text-teal-400 border border-teal-500 rounded-full"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            No categories
                          </span>
                        )}
                      </div>

                      {/* ACTIONS */}
                      <div className="flex flex-wrap gap-3">
                        {activeTab === "pending" ? (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleApprove(e, blog._id)}
                              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition"
                            >
                              Approve & Publish
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleReject(e, blog._id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition"
                            >
                              Reject
                            </motion.button>
                          </>
                        ) : (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleApproveDelete(e, blog._id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition"
                            >
                              Approve Deletion
                            </motion.button>
                            {/* <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleRejectDelete(e, blog._id)}
                              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition"
                            >
                              Reject Request
                            </motion.button> */}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
