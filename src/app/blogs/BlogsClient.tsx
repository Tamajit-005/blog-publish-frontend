"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BlogPagination from "@/components/Pagination";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

const POSTS_PER_PAGE = 6;
const CANCELLATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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
  deletionRequested?: boolean;
  deletionRequestedAt?: string;
  isDeletionRejected?: boolean;
  deletionRejectedNotes?: string;
  isEditPending?: boolean;
  isEditRejected?: boolean;
  pendingEdit?: {
    title: string;
    description?: string;
    coverImage?: string;
    categories: string[];
  };
}

function getRemainingSeconds(deletionRequestedAt?: string): number {
  if (!deletionRequestedAt) return 0;
  const elapsed = Date.now() - new Date(deletionRequestedAt).getTime();
  const remaining = CANCELLATION_WINDOW_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function BlogsClient() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [blogs, setBlogs] = useState<Blog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  // openMenuId tracks which blog's kebab menu is open on mobile (if any)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const pendingDeletions = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Close kebab menu when tapping outside
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    if (openMenuId) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch("/api/blogs/my-blogs");
        if (res.ok) {
          const data = await res.json();
          const fetchedBlogs: Blog[] = data.blogs || [];
          setBlogs(fetchedBlogs);

          // Seed countdowns directly here
          const initial: Record<string, number> = {};
          fetchedBlogs.forEach((b) => {
            if (b.deletionRequested && b.deletionRequestedAt) {
              const remaining = getRemainingSeconds(b.deletionRequestedAt);
              if (remaining > 0) initial[b._id] = remaining;
            }
          });
          setCountdowns(initial);
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

  // Global 1-second ticker for all active countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          if (next[id] > 1) {
            next[id] -= 1;
            changed = true;
          } else if (next[id] <= 1) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup pending deletion timers on unmount
  useEffect(() => {
    const timers = pendingDeletions.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const handleCancelDeletion = async (e: React.MouseEvent, blog: Blog) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/blogs/${blog._id}/cancel-deletion`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Deletion request cancelled");
        setBlogs((prev) =>
          prev
            ? prev.map((b) =>
                b._id === blog._id
                  ? {
                      ...b,
                      deletionRequested: false,
                      deletionRequestedAt: undefined,
                    }
                  : b,
              )
            : [],
        );
        setCountdowns((prev) => {
          const next = { ...prev };
          delete next[blog._id];
          return next;
        });
      } else if (res.status === 410) {
        toast.error("Cancellation window has expired");
        setCountdowns((prev) => {
          const next = { ...prev };
          delete next[blog._id];
          return next;
        });
      } else {
        toast.error(data.error || "Failed to cancel deletion request");
      }
    } catch {
      toast.error("Failed to cancel deletion request");
    }
  };

  const handleDelete = async (e: React.MouseEvent, blog: Blog) => {
    e.stopPropagation();

    const isPublished =
      blog.status === "published" || blog.status === "approved";

    if (isPublished) {
      if (
        !confirm(
          "This blog is published. Do you want to send a request to the Admin to delete it?",
        )
      )
        return;

      try {
        const res = await fetch(`/api/blogs/${blog._id}`, { method: "DELETE" });
        const data = await res.json();

        if (res.ok && data.action === "requested") {
          toast.success("Deletion request sent to Admin");
          const requestedAt: string =
            data.deletionRequestedAt ?? new Date().toISOString();
          setBlogs((prev) =>
            prev
              ? prev.map((b) =>
                  b._id === blog._id
                    ? {
                        ...b,
                        deletionRequested: true,
                        deletionRequestedAt: requestedAt,
                        isDeletionRejected: false,
                        deletionRejectedNotes: undefined,
                      }
                    : b,
                )
              : [],
          );
          setCountdowns((prev) => ({
            ...prev,
            [blog._id]: Math.ceil(CANCELLATION_WINDOW_MS / 1000),
          }));
        } else {
          toast.error(data.error || "Failed to request deletion");
        }
      } catch {
        toast.error("Failed to request deletion");
      }
      return;
    }

    if (!confirm("Are you sure you want to delete this blog?")) return;

    // Optimistically remove the blog and reset page if current page becomes empty
    setBlogs((prev) => {
      const updated = prev ? prev.filter((b) => b._id !== blog._id) : [];
      const newTotalPages = Math.ceil(updated.length / POSTS_PER_PAGE);
      if (currentPage > newTotalPages) setCurrentPage(1);
      return updated;
    });

    let undone = false;

    const toastId = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-100">
            Blog deleted
          </span>
          <button
            onClick={() => {
              undone = true;
              const timer = pendingDeletions.current.get(blog._id);
              if (timer) {
                clearTimeout(timer);
                pendingDeletions.current.delete(blog._id);
              }
              setBlogs((prev) =>
                prev
                  ? [blog, ...prev.filter((b) => b._id !== blog._id)]
                  : [blog],
              );
              toast.dismiss(t.id);
              toast.success("Deletion cancelled");
            }}
            className="text-teal-400 font-semibold text-sm hover:text-teal-300 underline underline-offset-2 shrink-0 transition-colors"
          >
            Undo
          </button>
        </div>
      ),
      {
        duration: 8000,
        style: {
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "0.75rem",
          padding: "12px 16px",
          color: "#f1f5f9",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        },
      },
    );

    const timer = setTimeout(async () => {
      pendingDeletions.current.delete(blog._id);
      if (undone) return;

      try {
        const res = await fetch(`/api/blogs/${blog._id}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
          toast.dismiss(toastId);
          toast.error(data.error || "Failed to delete blog");
          setBlogs((prev) =>
            prev ? [blog, ...prev.filter((b) => b._id !== blog._id)] : [blog],
          );
        }
      } catch {
        toast.dismiss(toastId);
        toast.error("Failed to delete blog");
        setBlogs((prev) =>
          prev ? [blog, ...prev.filter((b) => b._id !== blog._id)] : [blog],
        );
      }
    }, 8000);

    pendingDeletions.current.set(blog._id, timer);
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
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-teal-400">Your Blogs</h1>
        <Link
          href="/create"
          className="bg-teal-500 text-gray-900 font-semibold px-4 py-2 rounded-md hover:bg-teal-400 transition-all"
        >
          + Create Blog
        </Link>
      </div>

      {/* BLOG GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentBlogs.map((blog, i) => {
          const hasPendingEdit = blog.isEditPending && blog.pendingEdit;
          const displayTitle = hasPendingEdit
            ? blog.pendingEdit!.title
            : blog.title;
          const displayDescription = hasPendingEdit
            ? blog.pendingEdit!.description
            : blog.description;
          const displayCoverImage = hasPendingEdit
            ? (blog.pendingEdit!.coverImage ?? blog.coverImage)
            : blog.coverImage;
          const displayCategories = hasPendingEdit
            ? blog.pendingEdit!.categories
            : blog.categories;

          const remainingSeconds = countdowns[blog._id] ?? 0;
          const canCancelDeletion =
            blog.deletionRequested && remainingSeconds > 0;

          return (
            // ── h-full ensures the wrapper fills the grid cell height ──
            <motion.div
              key={blog._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="h-full"
            >
              {/* ── h-full makes every card stretch to match the tallest in the row ── */}
              <div
                onClick={() => {
                  if (openMenuId === blog._id) return; // don't navigate if menu is open
                  router.push(`/blogs/my/${blog._id}`); // navigate to blog details page on click
                }}
                className="group h-full flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:scale-[1.02] hover:border-teal-500 transition-all duration-300 cursor-pointer relative"
              >
                {/* ── DESKTOP: hover-reveal button strip ── */}
                <div className="absolute top-3 right-3 z-20 hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/blogs/edit/${blog._id}`);
                    }}
                    className="p-2 text-white rounded-full shadow-lg bg-blue-500/80 hover:bg-blue-600 transition-colors"
                    title="Edit Blog"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>

                  {canCancelDeletion ? (
                    <button
                      onClick={(e) => handleCancelDeletion(e, blog)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-white rounded-full shadow-lg bg-yellow-600/90 hover:bg-yellow-500 transition-colors text-[11px] font-semibold whitespace-nowrap"
                      title="Cancel deletion request"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      {formatCountdown(remainingSeconds)}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(e, blog)}
                      className={`p-2 text-white rounded-full shadow-lg transition-colors ${
                        blog.deletionRequested
                          ? "bg-yellow-600/80 cursor-default"
                          : "bg-red-500/80 hover:bg-red-600"
                      }`}
                      title={
                        blog.deletionRequested
                          ? "Deletion Requested (window expired)"
                          : "Delete Blog"
                      }
                      disabled={!!blog.deletionRequested}
                    >
                      {blog.deletionRequested ? (
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
                  )}
                </div>

                {/* ── MOBILE: always-visible ⋮ kebab menu ── */}
                <div className="absolute top-3 right-3 z-20 md:hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId((prev) =>
                        prev === blog._id ? null : blog._id,
                      );
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  {/* DROPDOWN */}
                  <AnimatePresence>
                    {openMenuId === blog._id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -4 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-1 w-44 bg-[#1a1c29] border border-gray-700 rounded-xl shadow-2xl overflow-hidden text-sm"
                      >
                        {/* Edit option */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            router.push(`/blogs/edit/${blog._id}`);
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-3 text-left hover:bg-blue-600/30 transition-colors text-blue-400"
                        >
                          <svg
                            className="w-4 h-4 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          Edit Blog
                        </button>

                        <div className="border-t border-gray-700" />

                        {/* Delete / Cancel option */}
                        {canCancelDeletion ? (
                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleCancelDeletion(e, blog);
                            }}
                            className="flex items-center gap-2.5 w-full px-4 py-3 text-left hover:bg-yellow-600/30 transition-colors text-yellow-400"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Cancel ({formatCountdown(remainingSeconds)})
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleDelete(e, blog);
                            }}
                            disabled={!!blog.deletionRequested}
                            className={`flex items-center gap-2.5 w-full px-4 py-3 text-left transition-colors ${
                              blog.deletionRequested
                                ? "text-yellow-500 opacity-60 cursor-default"
                                : "text-red-400"
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 shrink-0"
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
                            {blog.deletionRequested
                              ? "Deletion Pending"
                              : "Delete Blog"}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* COVER IMAGE */}
                {displayCoverImage ? (
                  <div className="relative w-full h-48 bg-gray-800 shrink-0">
                    <img
                      src={displayCoverImage}
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
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

                <div className="p-5 flex flex-col flex-1">
                  {/* STATUS ROW */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-xs px-2 py-1 rounded border ${getStatusColor(blog.status)}`}
                    >
                      {blog.status.toUpperCase()}
                    </span>

                    <div className="flex flex-col items-end gap-1">
                      {blog.deletionRequested && (
                        <span className="text-[10px] text-yellow-500 font-medium bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30">
                          {canCancelDeletion
                            ? `Deletion Requested · ${formatCountdown(remainingSeconds)}`
                            : "Deletion Requested"}
                        </span>
                      )}
                      {blog.isDeletionRejected && (
                        <span className="text-[10px] text-orange-400 font-medium bg-orange-500/10 px-2 py-1 rounded border border-orange-500/30">
                          Deletion Rejected
                        </span>
                      )}
                      {blog.isEditPending && (
                        <span className="text-[10px] text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">
                          Edit Under Review
                        </span>
                      )}
                      {blog.isEditRejected && (
                        <span className="text-[10px] text-red-400 font-medium bg-red-500/10 px-2 py-1 rounded border border-red-500/30">
                          Edit Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Blog rejection reason */}
                  {blog.status === "rejected" && blog.adminNotes && (
                    <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                      <span className="font-semibold">Rejection reason:</span>{" "}
                      {blog.adminNotes}
                    </div>
                  )}

                  {/* Deletion rejection reason */}
                  {blog.isDeletionRejected && blog.deletionRejectedNotes && (
                    <div className="mb-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-orange-400">
                      <span className="font-semibold">Deletion rejected:</span>{" "}
                      {blog.deletionRejectedNotes}
                    </div>
                  )}

                  {/* Edit rejection reason */}
                  {blog.isEditRejected && blog.adminNotes && (
                    <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                      <span className="font-semibold">Edit rejected:</span>{" "}
                      {blog.adminNotes}
                    </div>
                  )}

                  {/* TITLE */}
                  <h2 className="text-xl font-semibold text-white mb-2 line-clamp-2 group-hover:text-teal-400 transition-colors">
                    {displayTitle}
                  </h2>

                  {/* DESCRIPTION — clamped to 1 line so cards stay uniform */}
                  <p className="text-gray-400 text-sm line-clamp-1 mb-3">
                    {displayDescription || "No description."}
                  </p>

                  {/* CATEGORIES */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {displayCategories?.length ? (
                      displayCategories.map((cat, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 border border-teal-500 rounded"
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

                  {/* DATE */}
                  <div className="text-sm text-gray-500 mb-3">
                    {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                  {/* STATUS MESSAGE — pushed to bottom of card */}
                  <div className="mt-auto text-sm text-gray-500 flex flex-col gap-1">
                    {blog.status === "published" &&
                      !blog.isEditPending &&
                      !blog.isEditRejected &&
                      !blog.isDeletionRejected &&
                      !blog.deletionRequested && (
                        <p>Click to view published blog</p>
                      )}
                    {blog.status === "published" && blog.isEditPending && (
                      <p>Edit under review — Click to preview changes</p>
                    )}
                    {blog.isEditRejected && (
                      <p>Edit rejected — Click to view live blog or re-edit</p>
                    )}
                    {blog.isDeletionRejected && (
                      <p>
                        Deletion rejected — you may re-request or contact admin
                      </p>
                    )}
                    {blog.deletionRequested && canCancelDeletion && (
                      <p>Tap ⋮ to cancel deletion request</p>
                    )}
                    {blog.deletionRequested && !canCancelDeletion && (
                      <p>Deletion request sent — awaiting admin review</p>
                    )}
                    {blog.status === "pending" && (
                      <p>Awaiting Review - Click to preview</p>
                    )}
                    {blog.status === "rejected" && (
                      <p>
                        {blog.adminNotes
                          ? "Rejected - Click to view details"
                          : "Rejected"}
                      </p>
                    )}
                    {blog.status === "approved" && (
                      <p>Approved - Publishing Soon</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* PAGINATION */}
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
