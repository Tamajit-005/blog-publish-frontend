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

  // Pending edit fields (if isEditPending is true)
  pendingEdit?: {
    title: string;
    description?: string;
    coverImage?: string;
    categories: string[];
  };
}

const tabs = [
  {
    id: "manage" as const,
    label: "Manage Blogs",
    activeColor: "bg-emerald-700",
  },
  { id: "pending" as const, label: "Pending", activeColor: "bg-teal-600" },
  { id: "deletion" as const, label: "Deletion", activeColor: "bg-red-600" },
  { id: "edits" as const, label: "Edit Requests", activeColor: "bg-blue-600" },
];

export default function AdminBlogsClient() {
  const router = useRouter();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "manage" | "pending" | "deletion" | "edits"
  >("pending");

  useEffect(() => {
    if (activeTab === "manage") fetchAllBlogs();
    else if (activeTab === "pending") fetchPendingBlogs();
    else if (activeTab === "deletion") fetchDeletionRequests();
    else fetchEditRequests();
  }, [activeTab]);

  // Fetches all blogs for admin management (Manage tab)
  async function fetchAllBlogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs/all");
      const data = await res.json();
      setBlogs(data.blogs || []);
    } catch (err) {
      setError("Failed to fetch all blogs");
    } finally {
      setLoading(false);
    }
  }

  // Fetches blogs awaiting admin approval
  async function fetchPendingBlogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs/pending");
      const data = await res.json();
      setBlogs(data.blogs || []);
    } catch (err) {
      setError("Failed to fetch pending blogs");
    } finally {
      setLoading(false);
    }
  }

  // Fetches blogs with pending deletion requests from authors
  async function fetchDeletionRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs/delete-requests");
      const data = await res.json();
      setBlogs(data.blogs || []);
    } catch (err) {
      setError("Failed to fetch deletion requests");
    } finally {
      setLoading(false);
    }
  }

  // Fetches blogs with pending edit requests from authors
  async function fetchEditRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs/edit-requests");
      const data = await res.json();
      setBlogs(data.blogs || []);
    } catch (err) {
      setError("Failed to fetch edit requests");
    } finally {
      setLoading(false);
    }
  }

  // Directly deletes a blog from MongoDB and Strapi (admin-only, Manage tab)
  async function deleteBlog(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    if (!confirm("Delete this blog permanently? This cannot be undone."))
      return;

    const res = await fetch("/api/admin/blogs/delete-direct", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });

    if (res.ok) {
      alert("✅ Blog deleted successfully");
      fetchAllBlogs();
    } else {
      const data = await res.json();
      alert(`❌ ${data.error || "Failed to delete blog"}`);
    }
  }

  // Approves a pending blog and publishes it to Strapi
  async function handleApprove(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    if (!confirm("Approve and publish this blog?")) return;
    const res = await fetch("/api/admin/blogs/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) {
      alert("✅ Blog approved and published");
      fetchPendingBlogs();
    }
  }

  // Rejects a pending blog with an admin-provided reason
  async function handleReject(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    const res = await fetch("/api/admin/blogs/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, adminNotes: reason }),
    });
    if (res.ok) {
      alert("✅ Blog rejected");
      fetchPendingBlogs();
    }
  }

  // Approves a deletion request — permanently deletes blog from Strapi and MongoDB
  async function handleApproveDelete(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    if (!confirm("This will permanently delete the blog. Continue?")) return;
    const res = await fetch("/api/admin/blogs/approve-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) {
      alert("✅ Blog permanently deleted");
      fetchDeletionRequests();
    }
  }

  // Rejection of deletion request clears deletionRequested flag,
  // sets isDeletionRejected to true, and stores admin notes for the author
  async function handleRejectDelete(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    const reason = prompt("Reason for rejecting this deletion request:");
    if (!reason) return;
    const res = await fetch("/api/admin/blogs/reject-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, reason }),
    });
    if (res.ok) {
      alert("✅ Deletion request rejected");
      fetchDeletionRequests();
    } else {
      const data = await res.json();
      alert(`❌ ${data.error || "Failed to reject deletion"}`);
    }
  }

  // Approves pending edit, applies changes, and pushes updated blog to Strapi
  async function handleApproveEdit(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    if (!confirm("Approve these edits and push to live site?")) return;
    const res = await fetch("/api/admin/blogs/approve-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) {
      alert("✅ Edit approved!");
      fetchEditRequests();
    }
  }

  // Rejects a pending edit with an admin-provided reason
  async function handleRejectEdit(e: React.MouseEvent, blogId: string) {
    e.stopPropagation();
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    const res = await fetch("/api/admin/blogs/reject-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, adminNotes: reason }),
    });
    if (res.ok) {
      alert("✅ Edit rejected!");
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

          {/* TABS WITH SLIDING PILL */}
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

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${loading}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {loading ? (
              <div className="text-center mt-20 text-teal-400">Loading...</div>
            ) : blogs.length === 0 ? (
              <p className="text-center text-gray-400 mt-20">No blogs found.</p>
            ) : (
              <div className="space-y-6">
                {blogs.map((blog) => {
                  // In the edits tab, display pending edit data if available
                  const displayTitle =
                    activeTab === "edits" && blog.pendingEdit?.title
                      ? blog.pendingEdit.title
                      : blog.title;

                  const displayDescription =
                    activeTab === "edits" && blog.pendingEdit?.description
                      ? blog.pendingEdit.description
                      : blog.description;

                  const displayCoverImage =
                    activeTab === "edits" && blog.pendingEdit != null
                      ? blog.pendingEdit.coverImage
                      : blog.coverImage;

                  const displayCategories =
                    activeTab === "edits" && blog.pendingEdit?.categories
                      ? blog.pendingEdit.categories
                      : blog.categories;

                  return (
                    <motion.div
                      key={blog._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => router.push(`/admin/blogs/${blog._id}`)}
                      className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden cursor-pointer hover:border-teal-500 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* COVER IMAGE */}
                        <div className="md:w-80 h-64 flex-shrink-0">
                          {displayCoverImage ? (
                            <img
                              src={displayCoverImage}
                              className="w-full h-full object-cover"
                              alt={displayTitle}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600 text-sm">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="p-6 flex-1">
                          {/* TITLE + EDIT PENDING BADGE */}
                          <div className="flex items-start justify-between mb-2">
                            <h2 className="text-xl font-semibold">
                              {displayTitle}
                            </h2>

                            {activeTab === "edits" && (
                              <span className="ml-3 text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded flex-shrink-0">
                                Edit Pending
                              </span>
                            )}
                          </div>

                          {/* DESCRIPTION */}
                          <p className="text-gray-400 mb-3 line-clamp-2">
                            {displayDescription || "No description."}
                          </p>

                          {/* CATEGORIES */}
                          <div className="flex gap-2 flex-wrap mb-4">
                            {displayCategories.map((cat) => (
                              <span
                                key={cat}
                                className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 border border-teal-500 rounded"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>

                          {/* AUTHOR & DATE */}
                          <div className="flex gap-4 text-sm text-gray-500 mb-4">
                            <span>
                              By:{" "}
                              <strong className="text-teal-400">
                                {blog.author.username}
                              </strong>
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

                          {/* ACTION BUTTONS */}
                          <div className="flex gap-3">
                            {/* Admin direct delete — only on Manage tab */}
                            {activeTab === "manage" && (
                              <button
                                onClick={(e) => deleteBlog(e, blog._id)}
                                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition"
                              >
                                Delete
                              </button>
                            )}

                            {activeTab === "pending" && (
                              <>
                                <button
                                  onClick={(e) => handleApprove(e, blog._id)}
                                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => handleReject(e, blog._id)}
                                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Both approve and reject deletion buttons */}
                            {activeTab === "deletion" && (
                              <>
                                <button
                                  onClick={(e) =>
                                    handleApproveDelete(e, blog._id)
                                  }
                                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition"
                                >
                                  Approve Deletion
                                </button>
                                <button
                                  onClick={(e) =>
                                    handleRejectDelete(e, blog._id)
                                  }
                                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition"
                                >
                                  Reject Deletion
                                </button>
                              </>
                            )}

                            {activeTab === "edits" && (
                              <>
                                <button
                                  onClick={(e) =>
                                    handleApproveEdit(e, blog._id)
                                  }
                                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition"
                                >
                                  Approve Edit
                                </button>
                                <button
                                  onClick={(e) => handleRejectEdit(e, blog._id)}
                                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition"
                                >
                                  Reject Edit
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
