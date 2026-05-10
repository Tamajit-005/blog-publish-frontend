"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutGrid,
  Clock,
  Trash2,
  Edit3,
  Eye,
  Check,
  X,
  FileText,
} from "lucide-react";
import PyramidLoader from "@/components/PyramidLoader";

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

const TABS_CONFIG = [
  {
    id: "manage",
    label: "All Blogs",
    icon: LayoutGrid,
    color: "text-teal-400",
    hoverColor: "hover:text-teal-400",
    border: "border-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    id: "pending",
    label: "Pending",
    icon: Clock,
    color: "text-yellow-500",
    hoverColor: "hover:text-yellow-500",
    border: "border-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    id: "deletion",
    label: "Deletion",
    icon: Trash2,
    color: "text-red-500",
    hoverColor: "hover:text-red-500",
    border: "border-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: "edits",
    label: "Edits",
    icon: Edit3,
    color: "text-blue-400",
    hoverColor: "hover:text-blue-400",
    border: "border-blue-400",
    bg: "bg-blue-400/10",
  },
] as const;

export default function AdminBlogsClient() {
  const router = useRouter();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "manage" | "pending" | "deletion" | "edits"
  >("manage");

  useEffect(() => {
    if (activeTab === "manage") fetchAllBlogs();
    else if (activeTab === "pending") fetchPendingBlogs();
    else if (activeTab === "deletion") fetchDeletionRequests();
    else fetchEditRequests();
  }, [activeTab]);

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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusBadge = (status: string, tab: string) => {
    if (tab === "pending" || status === "pending")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
          <Clock size={12} /> Pending
        </span>
      );
    if (tab === "deletion")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-500">
          <Trash2 size={12} /> Deletion Req
        </span>
      );
    if (tab === "edits" || status === "edits")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-blue-400/30 bg-blue-400/10 text-blue-400">
          <Edit3 size={12} /> Edit Pending
        </span>
      );
    if (status === "published" || status === "approved")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
          <Check size={12} /> Approved
        </span>
      );
    if (status === "rejected")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-500">
          <X size={12} /> Rejected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-500/30 bg-gray-500/10 text-gray-400">
        Draft
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04070c]">
        <PyramidLoader />
      </div>
    );
  }

  return (
    <>
      {/* STATIC HERO BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image
          src="/images/hero-bg.webp"
          alt="Palette Publisher background"
          fill
          priority
          className="h-full w-full object-cover object-[60%_top] sm:object-top"
        />

        {/* DARKENING LAYERS */}
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
        className="relative z-10 min-h-screen text-white overflow-hidden pb-20"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-44 lg:pt-40">
          {/* HEADER SECTION */}
          <div className="flex flex-row items-start justify-between gap-3 sm:gap-6 mb-8 sm:mb-10">
            <div className="flex flex-col pt-0 sm:pt-1">
              <h1 className="text-[1.8rem] sm:text-[2.6rem] font-bold tracking-tight text-white leading-tight">
                Admin{" "}
                <span className="text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.2)]">
                  Blogs
                </span>
              </h1>
              <p className="mt-1 sm:mt-1.5 text-[0.8rem] sm:text-[0.98rem] text-white/60 max-w-[240px] sm:max-w-sm leading-relaxed sm:leading-snug">
                Review and manage all submitted blogs from your platform.
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-4 rounded-[14px] sm:rounded-2xl border border-white/8 bg-white/[0.02] p-2.5 sm:p-4 backdrop-blur-md shrink-0">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-md sm:rounded-[12px] bg-teal-400/10 border border-teal-400/20">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-teal-300" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[0.6rem] sm:text-[0.8rem] uppercase tracking-wider text-white/50 font-medium leading-none mb-1 sm:mb-1.5">
                  Total Blogs
                </p>
                <p className="text-[1.2rem] sm:text-2xl font-bold text-teal-400 leading-none">
                  {blogs.length}
                </p>
              </div>
            </div>
          </div>

          {/* TABS SECTION */}
          <div className="mb-8 flex overflow-x-auto pb-4 gap-2 sm:gap-4 border-b border-white/10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {TABS_CONFIG.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-3 py-3 sm:px-5 sm:py-4 text-[0.85rem] sm:text-[0.92rem] font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? `${tab.color}`
                      : `text-white/100 ${tab.hoverColor}`
                  }`}
                >
                  <Icon size={16} className={isActive ? "" : "opacity-60"} />
                  {tab.label}
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[0.7rem] font-bold ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/30"
                    }`}
                  >
                    {isActive ? blogs.length : "-"}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="adminActiveTab"
                      className={`absolute bottom-0 left-0 right-0 h-[2px] ${tab.bg.replace(
                        "/10",
                        "",
                      )} shadow-[0_0_12px_currentColor]`}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* CONTENT CONTAINER */}
          <div className="bg-[#0b1019]/80 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden min-h-[400px]">
            {/* DESKTOP TABLE HEADER */}
            <div className="hidden lg:grid grid-cols-[3fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <span className="text-[0.7rem] font-semibold text-white/40 tracking-wider uppercase">
                Blog
              </span>
              <span className="text-[0.7rem] font-semibold text-white/40 tracking-wider uppercase">
                Author
              </span>
              <span className="text-[0.7rem] font-semibold text-white/40 tracking-wider uppercase">
                Category
              </span>
              <span className="text-[0.7rem] font-semibold text-white/40 tracking-wider uppercase">
                Status
              </span>
              <span className="text-[0.7rem] font-semibold text-white/40 tracking-wider uppercase">
                Submitted On
              </span>
              <span className="text-[0.7rem] font-semibold text-white/40 tracking-wider uppercase text-center w-24">
                Actions
              </span>
            </div>

            {/* LIST */}
            <AnimatePresence mode="wait">
              {blogs.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <FileText className="h-12 w-12 text-white/10 mb-4" />
                  <p className="text-[1.05rem] text-white/40">
                    No blogs found in this category.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  {blogs.map((blog) => {
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

                    const primaryCategory =
                      displayCategories?.[0] || "Uncategorized";
                    const { date, time } = formatDate(blog.createdAt);
                    const authorInitials = getInitials(blog.author.username);

                    const ActionButtons = () => (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/blogs/${blog._id}`);
                          }}
                          className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all"
                          title="View Details"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>

                        {activeTab === "manage" && (
                          <button
                            onClick={(e) => deleteBlog(e, blog._id)}
                            className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete Blog"
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        )}

                        {activeTab === "pending" && (
                          <>
                            <button
                              onClick={(e) => handleApprove(e, blog._id)}
                              className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-teal-500/20 text-teal-400 hover:bg-teal-500/10 transition-all"
                              title="Approve Blog"
                            >
                              <Check size={18} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={(e) => handleReject(e, blog._id)}
                              className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                              title="Reject Blog"
                            >
                              <X size={18} strokeWidth={2.5} />
                            </button>
                          </>
                        )}

                        {activeTab === "deletion" && (
                          <>
                            <button
                              onClick={(e) => handleApproveDelete(e, blog._id)}
                              className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                              title="Confirm Deletion"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={(e) => handleRejectDelete(e, blog._id)}
                              className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all"
                              title="Reject Deletion Request"
                            >
                              <X size={18} strokeWidth={2.5} />
                            </button>
                          </>
                        )}

                        {activeTab === "edits" && (
                          <>
                            <button
                              onClick={(e) => handleApproveEdit(e, blog._id)}
                              className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-teal-500/20 text-teal-400 hover:bg-teal-500/10 transition-all"
                              title="Approve Edits"
                            >
                              <Check size={18} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={(e) => handleRejectEdit(e, blog._id)}
                              className="flex h-9 w-12 lg:w-10 items-center justify-center rounded-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                              title="Reject Edits"
                            >
                              <X size={18} strokeWidth={2.5} />
                            </button>
                          </>
                        )}
                      </>
                    );

                    return (
                      <div
                        key={blog._id}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        {/* DESKTOP ROW */}
                        <div className="hidden lg:grid grid-cols-[3fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-white/5">
                          <div className="flex gap-4 items-center overflow-hidden pr-4">
                            <div className="w-16 h-16 shrink-0 rounded-[10px] overflow-hidden bg-[#06080d] border border-white/5">
                              {displayCoverImage ? (
                                <img
                                  src={displayCoverImage}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-white/10" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <h2 className="text-[0.95rem] font-semibold text-white/90 truncate">
                                {displayTitle || "Untitled"}
                              </h2>
                              <p className="text-[0.75rem] text-white/40 truncate mt-0.5">
                                {displayDescription || "No description"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold">
                              {authorInitials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[0.85rem] text-white/90 truncate">
                                {blog.author.username}
                              </span>
                              <span className="text-[0.7rem] text-white/40 truncate">
                                {blog.author.email}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="px-3 py-1 text-[0.7rem] font-medium rounded-full border border-teal-500/30 text-teal-300 bg-teal-500/5 whitespace-nowrap">
                              {primaryCategory}
                            </span>
                          </div>

                          <div>{getStatusBadge(blog.status, activeTab)}</div>

                          <div className="flex flex-col text-[0.8rem] text-white/60">
                            <span className="text-white/80">{date}</span>
                            <span className="text-[0.7rem] text-white/40">
                              {time}
                            </span>
                          </div>

                          <div className="flex gap-2 justify-center w-24">
                            <ActionButtons />
                          </div>
                        </div>

                        {/* MOBILE ROW */}
                        <div className="flex flex-col gap-4 p-4 sm:p-5 border-b border-white/5 lg:hidden">
                          <div className="flex gap-3 sm:gap-4">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-[12px] overflow-hidden bg-[#06080d] border border-white/5">
                              {displayCoverImage ? (
                                <img
                                  src={displayCoverImage}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-white/10" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col min-w-0 pt-0.5">
                              <h2 className="text-[0.95rem] sm:text-[1.05rem] font-semibold text-white/90 line-clamp-2 leading-tight mb-1">
                                {displayTitle || "Untitled"}
                              </h2>
                              <p className="text-[0.75rem] sm:text-[0.8rem] text-white/40 line-clamp-2 leading-relaxed">
                                {displayDescription ||
                                  "No description provided."}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0 justify-start">
                              <ActionButtons />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[0.6rem] sm:text-[0.65rem] font-bold">
                                {authorInitials}
                              </div>
                              <span className="text-[0.75rem] sm:text-[0.8rem] text-white/80 max-w-[80px] sm:max-w-[120px] truncate">
                                {blog.author.username}
                              </span>
                            </div>
                            <div className="scale-90 sm:scale-100 origin-right">
                              {getStatusBadge(blog.status, activeTab)}
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[0.75rem] sm:text-[0.8rem] text-white/60">
                                {date}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}
