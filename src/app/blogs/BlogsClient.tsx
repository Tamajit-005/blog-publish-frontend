"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import BlogPagination from "@/components/Pagination";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Feather,
  FileText,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { FIXED_CATEGORIES } from "@/lib/categories";
import PyramidLoader from "@/components/PyramidLoader";

const CANCELLATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface Blog {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  categories: any[];
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
    categories: any[];
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

function getDisplayName(cat: any): string {
  if (!cat) return "Uncategorized";
  const strVal =
    typeof cat === "object"
      ? cat.name || cat.slug || cat.documentId
      : String(cat);

  const found = FIXED_CATEGORIES.find(
    (c) =>
      c.slug === strVal ||
      c.documentId === strVal ||
      c.name === strVal ||
      c.name.toLowerCase() === strVal.toLowerCase(),
  );
  return found ? found.name : strVal;
}

export default function BlogsClient() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [blogs, setBlogs] = useState<Blog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [postsPerPage, setPostsPerPage] = useState(8);

  const pendingDeletions = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const updatePostsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1280) {
        setPostsPerPage(8);
      } else if (width >= 1024) {
        setPostsPerPage(9);
      } else if (width >= 768) {
        setPostsPerPage(8);
      } else {
        setPostsPerPage(8);
      }
    };

    updatePostsPerPage();
    window.addEventListener("resize", updatePostsPerPage);
    return () => window.removeEventListener("resize", updatePostsPerPage);
  }, []);

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

    setBlogs((prev) => {
      const updated = prev ? prev.filter((b) => b._id !== blog._id) : [];
      const newTotalPages = Math.ceil(updated.length / postsPerPage);
      if (currentPage > newTotalPages && currentPage > 1)
        setCurrentPage(currentPage - 1);
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
              setBlogs((prev) => (prev ? [blog, ...prev] : [blog]));
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
        duration: 10000,
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
          setBlogs((prev) => (prev ? [blog, ...prev] : [blog]));
        }
      } catch {
        toast.dismiss(toastId);
        toast.error("Failed to delete blog");
        setBlogs((prev) => (prev ? [blog, ...prev] : [blog]));
      }
    }, 10000);

    pendingDeletions.current.set(blog._id, timer);
  };

  const filteredBlogs = useMemo(() => {
    if (!blogs) return [];
    if (selectedCategory === "All") return blogs;

    const categoryObj = FIXED_CATEGORIES.find(
      (c) => c.name === selectedCategory,
    );

    return blogs.filter((blog) => {
      const cats =
        blog.isEditPending && blog.pendingEdit
          ? blog.pendingEdit.categories
          : blog.categories;
      if (!cats || !Array.isArray(cats)) return false;

      return cats.some((cat) => {
        const strVal =
          typeof cat === "object"
            ? cat.name || cat.slug || cat.documentId
            : String(cat);

        if (strVal === selectedCategory) return true;
        if (
          categoryObj &&
          (strVal === categoryObj.slug || strVal === categoryObj.documentId)
        )
          return true;
        if (strVal.toLowerCase() === selectedCategory.toLowerCase())
          return true;

        return false;
      });
    });
  }, [blogs, selectedCategory]);

  const totalPages = Math.ceil(filteredBlogs.length / postsPerPage);
  const startIdx = (currentPage - 1) * postsPerPage;
  const currentBlogs = filteredBlogs.slice(startIdx, startIdx + postsPerPage);

  const getStatusBadge = (blog: Blog) => {
    if (blog.status === "published")
      return {
        label: "Published",
        classes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      };
    if (blog.status === "pending")
      return {
        label: "Pending",
        classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      };
    if (blog.status === "approved")
      return {
        label: "Approved",
        classes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      };
    if (blog.status === "rejected")
      return {
        label: "Rejected",
        classes: "bg-red-500/20 text-red-400 border-red-500/30",
      };
    return {
      label: "Draft",
      classes: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04070c]">
        {/* Replaced text with PyramidLoader */}
        <PyramidLoader />
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image
          src="/images/hero-bg.webp"
          alt="Palette Publisher background"
          fill
          priority
          className="h-full w-full object-cover object-[60%_top] sm:object-top"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,0.96)_0%,rgba(3,5,10,0.94)_28%,rgba(3,5,10,0.82)_45%,rgba(3,5,10,0.40)_65%,rgba(3,5,10,0.45)_80%,rgba(3,5,10,0.75)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(45,212,191,0.06),transparent_20%)]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-[#02050a] via-[#02050a]/80 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#02050a] via-[#02050a]/90 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        <main className="relative min-h-screen text-white overflow-hidden pb-20">
          <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-12 pt-44 lg:pt-40">
            <div className="flex flex-row items-start justify-between gap-3 sm:gap-6 mb-8 sm:mb-10">
              <div className="flex items-start gap-3 sm:gap-5 flex-1">
                <div className="flex shrink-0 h-10 w-10 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-teal-400/20 bg-teal-400/5 shadow-[0_0_30px_rgba(45,212,191,0.08)] mt-0.5 sm:mt-0">
                  <Feather className="h-5 w-5 sm:h-7 sm:w-7 text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]" />
                </div>
                <div className="pt-0 sm:pt-1">
                  <h1 className="text-[1.35rem] sm:text-[2.6rem] font-bold tracking-tight text-white leading-tight">
                    Explore{" "}
                    <span className="text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.2)]">
                      Blogs
                    </span>
                  </h1>
                  <p className="mt-1 sm:mt-1.5 text-[0.65rem] sm:text-[0.98rem] text-white/60 max-w-[180px] sm:max-w-sm leading-relaxed sm:leading-snug">
                    Discover stories, ideas, and perspectives from writers
                    around the world.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-4 rounded-[14px] sm:rounded-2xl border border-white/8 bg-white/[0.02] p-2.5 sm:p-4 backdrop-blur-md shrink-0">
                <div className="flex h-7 w-7 sm:h-12 sm:w-12 items-center justify-center rounded-md sm:rounded-[12px] bg-teal-400/10 border border-teal-400/20">
                  <FileText className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-teal-300" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[0.55rem] sm:text-[0.8rem] uppercase tracking-wider text-white/50 font-medium leading-none mb-1 sm:mb-1.5">
                    Total Blogs
                  </p>
                  <p className="text-[1.1rem] sm:text-2xl font-bold text-teal-400 leading-none">
                    {filteredBlogs.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8 flex overflow-x-auto pb-4 gap-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {["All", ...FIXED_CATEGORIES.map((c) => c.name)].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`relative shrink-0 rounded-full border px-5 py-2 text-[0.92rem] font-medium transition-all duration-300 ${
                      isActive
                        ? "border-teal-400/40 bg-teal-400/10 text-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.12)]"
                        : "border-white/20 bg-transparent text-white/100 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {currentBlogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01] backdrop-blur-sm">
                <p className="text-[1.05rem] text-white/40 mb-4">
                  No blogs found for "{selectedCategory}".
                </p>
                <Link
                  href="/create"
                  className="px-6 py-2.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 transition-colors font-medium text-sm"
                >
                  Create New Blog
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                {currentBlogs.map((blog) => {
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

                  const rawCategory = (
                    hasPendingEdit
                      ? blog.pendingEdit!.categories
                      : blog.categories
                  )?.[0];
                  const primaryCategory = getDisplayName(rawCategory);

                  const remainingSeconds = countdowns[blog._id] ?? 0;
                  const canCancelDeletion =
                    blog.deletionRequested && remainingSeconds > 0;
                  const statusBadge = getStatusBadge(blog);

                  return (
                    <div
                      key={blog._id}
                      onClick={() => {
                        if (openMenuId === blog._id) return;
                        router.push(`/blogs/my/${blog._id}`);
                      }}
                      className="group flex flex-row md:flex-col bg-[#0b1019]/60 border border-white/5 rounded-[20px] overflow-hidden hover:border-teal-400/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer relative backdrop-blur-md"
                    >
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
                        <span
                          className={`px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${statusBadge.classes}`}
                        >
                          {statusBadge.label}
                        </span>
                        {blog.isEditPending && (
                          <span className="px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md bg-purple-500/20 text-purple-400 border-purple-500/30">
                            Editing
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 z-20 hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/blogs/edit/${blog._id}`);
                          }}
                          className="p-2 text-white/90 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-teal-500/20 hover:text-teal-300 hover:border-teal-500/50 transition-all"
                          title="Edit Blog"
                        >
                          <Edit2 size={16} strokeWidth={2} />
                        </button>

                        {canCancelDeletion ? (
                          <button
                            onClick={(e) => handleCancelDeletion(e, blog)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-yellow-300 rounded-full bg-black/60 backdrop-blur-md border border-yellow-500/30 hover:bg-yellow-500/20 transition-all text-[0.75rem] font-semibold"
                            title="Cancel deletion request"
                          >
                            <X size={14} strokeWidth={2.5} />
                            {formatCountdown(remainingSeconds)}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleDelete(e, blog)}
                            className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                              blog.deletionRequested
                                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 cursor-default"
                                : "bg-black/60 border-white/10 text-white/90 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                            }`}
                            title={
                              blog.deletionRequested
                                ? "Deletion Requested"
                                : "Delete Blog"
                            }
                            disabled={!!blog.deletionRequested}
                          >
                            {blog.deletionRequested ? (
                              <AlertCircle size={16} />
                            ) : (
                              <Trash2 size={16} strokeWidth={2} />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="absolute top-2 right-2 z-20 md:hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) =>
                              prev === blog._id ? null : blog._id,
                            );
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {openMenuId === blog._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.92, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92, y: -4 }}
                              transition={{ duration: 0.15 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-44 bg-[#141a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden text-[0.9rem] z-30"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  router.push(`/blogs/edit/${blog._id}`);
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors text-white/80 hover:text-teal-300"
                              >
                                <Edit2 size={15} /> Edit Blog
                              </button>
                              <div className="border-t border-white/5" />
                              {canCancelDeletion ? (
                                <button
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    handleCancelDeletion(e, blog);
                                  }}
                                  className="flex items-center gap-2.5 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors text-yellow-400"
                                >
                                  <X size={15} /> Cancel (
                                  {formatCountdown(remainingSeconds)})
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    handleDelete(e, blog);
                                  }}
                                  disabled={!!blog.deletionRequested}
                                  className={`flex items-center gap-2.5 w-full px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                                    blog.deletionRequested
                                      ? "text-yellow-500 opacity-60 cursor-default"
                                      : "text-red-400 hover:text-red-300"
                                  }`}
                                >
                                  {blog.deletionRequested ? (
                                    <AlertCircle size={15} />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                  {blog.deletionRequested
                                    ? "Deletion Pending"
                                    : "Delete Blog"}
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="relative w-2/5 sm:w-[45%] md:w-full min-h-[130px] sm:min-h-[150px] md:min-h-0 md:h-48 shrink-0 bg-[#06080d] overflow-hidden">
                        {displayCoverImage ? (
                          <Image
                            src={displayCoverImage}
                            alt={displayTitle}
                            fill
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#06080d]">
                            <Feather className="w-8 h-8 md:w-10 md:h-10 text-white/10" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 z-10">
                          <span className="px-2 py-1 md:px-2.5 md:py-1 text-[0.65rem] md:text-[0.7rem] font-medium rounded-full bg-black/60 backdrop-blur-md border border-teal-500/30 text-teal-300">
                            {primaryCategory}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1019] via-transparent to-transparent opacity-80 md:opacity-0" />
                      </div>

                      <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-1 w-full relative z-10">
                        <h2 className="text-[0.95rem] sm:text-[1.05rem] md:text-[1.15rem] font-semibold text-white/90 leading-tight line-clamp-2 mb-1.5 md:mb-2 group-hover:text-white transition-colors">
                          {displayTitle || "Untitled Blog"}
                        </h2>

                        <p className="text-[0.75rem] sm:text-[0.85rem] text-white/50 leading-relaxed line-clamp-2 mb-3 md:mb-4">
                          {displayDescription || "No description provided."}
                        </p>

                        <div className="mt-auto flex items-center gap-1.5 text-[0.75rem] sm:text-[0.8rem] text-white/40">
                          <Calendar
                            size={12}
                            className="mb-0.5 md:w-[14px] md:h-[14px]"
                          />
                          <span>
                            {new Date(blog.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>

                        {(blog.status === "rejected" ||
                          blog.isDeletionRejected ||
                          blog.isEditRejected) && (
                          <div className="mt-2 md:mt-3 text-[0.7rem] md:text-[0.75rem] text-red-400/80 bg-red-500/10 px-2 py-1.5 rounded-md border border-red-500/10 line-clamp-1">
                            {blog.adminNotes ||
                              blog.deletionRejectedNotes ||
                              "Review notes available. Click to view."}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <BlogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/blogs"
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </main>
      </motion.div>
    </>
  );
}
