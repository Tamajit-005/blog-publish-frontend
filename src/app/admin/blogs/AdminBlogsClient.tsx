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
  isEditPending?: boolean;

  pendingEdit?: {
    title: string;
    description?: string;
    coverImage?: string;
    categories: string[];
  };
}

const tabs = [
  { id: "manage" as const, label: "Manage Blogs", activeColor: "bg-emerald-700" },
  { id: "pending" as const, label: "Pending", activeColor: "bg-teal-600" },
  { id: "deletion" as const, label: "Deletion", activeColor: "bg-red-600" },
  { id: "edits" as const, label: "Edit Requests", activeColor: "bg-blue-600" },
];


export default function AdminBlogsClient() {
  const router = useRouter();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "manage" | "pending" | "deletion" | "edits"
  >("pending");

  useEffect(() => {
    if (activeTab === "manage") fetchAllBlogs();
    else if (activeTab === "pending") fetchPendingBlogs();
    else if (activeTab === "deletion") fetchDeletionRequests();
    else fetchEditRequests();
  }, [activeTab]);

  async function fetchAllBlogs() {
    setLoading(true);
    const res = await fetch("/api/admin/blogs/all");
    const data = await res.json();
    setBlogs(data.blogs || []);
    setLoading(false);
  }

  async function fetchPendingBlogs() {
    setLoading(true);
    const res = await fetch("/api/admin/blogs/pending");
    const data = await res.json();
    setBlogs(data.blogs || []);
    setLoading(false);
  }

  async function fetchDeletionRequests() {
    setLoading(true);
    const res = await fetch("/api/admin/blogs/delete-requests");
    const data = await res.json();
    setBlogs(data.blogs || []);
    setLoading(false);
  }

  async function fetchEditRequests() {
    setLoading(true);
    const res = await fetch("/api/admin/blogs/edit-requests");
    const data = await res.json();
    setBlogs(data.blogs || []);
    setLoading(false);
  }

  async function deleteBlog(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    if (!confirm("Delete this blog permanently?")) return;

    const res = await fetch("/api/admin/blogs/delete-direct", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId }),
    });

    if (res.ok) {
      alert("Blog deleted successfully");
      fetchAllBlogs();
    }
  }

  async function handleApprove(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    const res = await fetch("/api/admin/blogs/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId }),
    });

    if (res.ok) {
      alert("Blog approved");
      fetchPendingBlogs();
    }
  }

  async function handleReject(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    const reason = prompt("Reason for rejection");
    if (!reason) return;

    const res = await fetch("/api/admin/blogs/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId, adminNotes: reason }),
    });

    if (res.ok) {
      alert("Blog rejected");
      fetchPendingBlogs();
    }
  }

  async function handleApproveDelete(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    const res = await fetch("/api/admin/blogs/approve-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId }),
    });

    if (res.ok) {
      alert("Blog permanently deleted");
      fetchDeletionRequests();
    }
  }

  async function handleRejectDelete(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    const reason = prompt("Reason for rejecting deletion");
    if (!reason) return;

    const res = await fetch("/api/admin/blogs/reject-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId, reason }),
    });

    if (res.ok) {
      alert("Deletion rejected");
      fetchDeletionRequests();
    }
  }

  async function handleApproveEdit(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    const res = await fetch("/api/admin/blogs/approve-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId }),
    });

    if (res.ok) {
      alert("Edit approved");
      fetchEditRequests();
    }
  }

  async function handleRejectEdit(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();

    const reason = prompt("Reason for rejection");
    if (!reason) return;

    const res = await fetch("/api/admin/blogs/reject-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blogId, adminNotes: reason }),
    });

    if (res.ok) {
      alert("Edit rejected");
      fetchEditRequests();
    }
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

          <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg relative">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 z-10"
                style={{
                  color: activeTab === tab.id ? "white" : "rgb(156 163 175)",
                }}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="activeTabPill"
                    className={`absolute inset-0 rounded-md ${tab.activeColor}`}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${loading}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {loading ? (
              <div className="text-center mt-20 text-teal-400">
                Loading...
              </div>
            ) : blogs.length === 0 ? (
              <p className="text-center text-gray-400 mt-20">
                No blogs found.
              </p>
            ) : (
              <div className="space-y-6">
                {blogs.map((blog) => (
                  <motion.div
                    key={blog._id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => router.push(`/admin/blogs/${blog._id}`)}
                    className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden cursor-pointer hover:border-teal-500 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row">

                      <div className="md:w-80 h-64 flex-shrink-0">
                        {blog.coverImage ? (
                          <img
                            src={blog.coverImage}
                            className="w-full h-full object-cover"
                            alt={blog.title}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600 text-sm">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="p-6 flex-1">

                        <h2 className="text-xl font-semibold">
                          {blog.title}
                        </h2>

                        <p className="text-gray-400 mb-3 line-clamp-2">
                          {blog.description || "No description"}
                        </p>

                        <div className="flex gap-2 flex-wrap mb-4">
                          {blog.categories.map((cat) => (
                            <span
                              key={cat}
                              className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 border border-teal-500 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-3">

                          {activeTab === "manage" && (
                            <button
                              onClick={(e) => deleteBlog(e, blog._id)}
                              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-white"
                            >
                              Delete
                            </button>
                          )}

                          {activeTab === "pending" && (
                            <>
                              <button
                                onClick={(e) => handleApprove(e, blog._id)}
                                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
                              >
                                Approve
                              </button>

                              <button
                                onClick={(e) => handleReject(e, blog._id)}
                                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {activeTab === "deletion" && (
                            <>
                              <button
                                onClick={(e) =>
                                  handleApproveDelete(e, blog._id)
                                }
                                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded"
                              >
                                Approve Deletion
                              </button>

                              <button
                                onClick={(e) =>
                                  handleRejectDelete(e, blog._id)
                                }
                                className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {activeTab === "edits" && (
                            <>
                              <button
                                onClick={(e) =>
                                  handleApproveEdit(e, blog._id)
                                }
                                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
                              >
                                Approve Edit
                              </button>

                              <button
                                onClick={(e) =>
                                  handleRejectEdit(e, blog._id)
                                }
                                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded"
                              >
                                Reject Edit
                              </button>
                            </>
                          )}

                        </div>

                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </motion.div>
  );
}