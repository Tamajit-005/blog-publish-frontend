"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { PortableText } from "@portabletext/react";
import { portableComponents } from "@/lib/portableComponents";
import { markdownToBlocks } from "@/lib/markdownToBlocks";
import { urlFor } from "@/sanity/image";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Trash2,
  Check,
  X,
  User,
  ShieldCheck,
} from "lucide-react";
import PyramidLoader from "@/components/PyramidLoader";

interface InlineImage {
  id: string;
  placeholder: string;
  base64: string;
  sanityAssetId?: string;
  sanityUrl?: string;
}

interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  description?: string;
  coverImage?: string;
  inlineImages?: InlineImage[];
  categories: string[];
  author: {
    username: string;
    email: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  deletionRequested?: boolean;
  isEditPending?: boolean;
  pendingEdit?: {
    title: string;
    slug: string;
    content: string;
    description?: string;
    coverImage?: string;
    inlineImages?: InlineImage[];
    categories: string[];
  };
}

export default function AdminBlogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = typeof params?.id === "string" ? params.id : "";

  const [blog, setBlog] = useState<Blog | null>(null);
  const [sanityPost, setSanityPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blogId) return;
    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/admin/blogs/${blogId}`);
        if (!res.ok) throw new Error("Failed to fetch blog");
        const data = await res.json();
        const fetched = data.blog;
        setBlog(fetched);
        // If published with sanityId, fetch accurate Sanity doc for view
        const sid = (fetched as any)?.sanityId;
        if (sid && (fetched.status === "published" || fetched.status === "approved")) {
          try {
            const sRes = await fetch(`/api/sanity/post/${sid}`);
            if (sRes.ok) {
              const sData = await sRes.json();
              setSanityPost(sData.post);
            }
          } catch {}
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [blogId]);

  // --- ADMIN ACTIONS ---

  // Direct Delete Logic from AdminBlogsClient
  const deleteBlogDirect = async () => {
    if (!confirm("Delete this blog permanently? This cannot be undone."))
      return;

    try {
      const res = await fetch("/api/admin/blogs/delete-direct", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId }),
      });

      if (res.ok) {
        toast.success("Blog deleted successfully");
        router.push("/admin/blogs");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete blog");
      }
    } catch (err) {
      toast.error("An error occurred during deletion");
    }
  };

  const handleApprove = async () => {
    if (!confirm("Approve and publish this blog?")) return;
    const res = await fetch("/api/admin/blogs/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) {
      toast.success("Blog approved");
      router.push("/admin/blogs");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    const res = await fetch("/api/admin/blogs/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, adminNotes: reason }),
    });
    if (res.ok) {
      toast.success("Blog rejected");
      router.push("/admin/blogs");
    }
  };

  const handleApproveDelete = async () => {
    if (!confirm("Permanently delete this blog?")) return;
    const res = await fetch("/api/admin/blogs/approve-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) {
      toast.success("Blog deleted");
      router.push("/admin/blogs");
    }
  };

  const handleRejectDelete = async () => {
    const reason = prompt("Reason for rejecting deletion:");
    if (!reason) return;
    const res = await fetch("/api/admin/blogs/reject-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, reason }),
    });
    if (res.ok) {
      toast.success("Deletion rejected");
      router.push("/admin/blogs");
    }
  };

  const handleApproveEdit = async () => {
    if (!confirm("Approve requested edits?")) return;
    const res = await fetch("/api/admin/blogs/approve-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) {
      toast.success("Edits approved!");
      router.push("/admin/blogs");
    }
  };

  const handleRejectEdit = async () => {
    const reason = prompt("Reason for edit rejection:");
    if (!reason) return;
    const res = await fetch("/api/admin/blogs/reject-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId, adminNotes: reason }),
    });
    if (res.ok) {
      toast.success("Edit rejected!");
      router.push("/admin/blogs");
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (!code) return;
      await navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    } catch {
      toast.error("Copy failed");
    }
  };

  // Process Base64 Inline Images
  const getProcessedContent = (currentBlog: Blog) => {
    let content = currentBlog.content || "";
    // If we are looking at a pending edit, use those images, otherwise use original
    const images =
      currentBlog.isEditPending && currentBlog.pendingEdit
        ? currentBlog.pendingEdit.inlineImages
        : currentBlog.inlineImages;

    if (images && images.length > 0) {
      images.forEach((img) => {
        if (img.placeholder && img.base64) {
          content = content
            .split(img.placeholder)
            .join(
              `<img src="${img.base64.trim()}" alt="Inline Image" class="rounded-lg w-full my-4 object-cover" />`,
            );
        }
      });
    }
    return content;
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#04070c] flex items-center justify-center">
        <PyramidLoader />
      </div>
    );
  if (error || !blog)
    return (
      <div className="min-h-screen bg-[#04070c] flex items-center justify-center text-red-500">
        {error || "Not found"}
      </div>
    );

  const displayBlog: Blog =
    blog.isEditPending && blog.pendingEdit
      ? {
          ...blog,
          title: blog.pendingEdit.title,
          slug: blog.pendingEdit.slug,
          content: blog.pendingEdit.content,
          description: blog.pendingEdit.description,
          coverImage: blog.pendingEdit.coverImage ?? blog.coverImage,
          inlineImages: blog.pendingEdit.inlineImages ?? blog.inlineImages,
          categories: blog.pendingEdit.categories,
        }
      : blog;

  const finalContent = getProcessedContent(displayBlog);
  const statusColors = {
    pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    published: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    approved: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    rejected: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  return (
    <div className="relative min-h-screen bg-[#04070c] text-white selection:bg-teal-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image
          src="/images/hero-bg.webp"
          alt="bg"
          fill
          className="h-full w-full object-cover object-[60%_top] sm:object-top"
          priority
        />
        {/* DARKENING LAYERS */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,0.96)_0%,rgba(3,5,10,0.94)_28%,rgba(3,5,10,0.82)_45%,rgba(3,5,10,0.40)_65%,rgba(3,5,10,0.45)_80%,rgba(3,5,10,0.75)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(45,212,191,0.06),transparent_20%)]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-[#02050a] via-[#02050a]/80 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#02050a] via-[#02050a]/90 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-36 sm:pt-40 lg:pt-44 pb-12">
        <button
          onClick={() => router.push("/admin/blogs")}
          className="group flex items-center gap-2 text-teal-400 font-semibold mb-8 hover:text-teal-300 transition-colors w-fit"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Admin Dashboard
        </button>

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start lg:h-[130vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col bg-[#0b1019]/70 border border-white/5 rounded-[28px] backdrop-blur-xl shadow-2xl w-full lg:h-full lg:overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-white/5 shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${statusColors[blog.status as keyof typeof statusColors] || "text-gray-400 border-white/10"}`}
                    >
                      {blog.status}
                    </span>
                    {blog.deletionRequested && (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md bg-red-500/20 text-red-400 border-red-500/30">
                        Deletion Requested
                      </span>
                    )}
                    {blog.isEditPending && (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Edit Pending
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    {displayBlog.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {displayBlog.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full text-xs font-semibold"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 sm:p-8 lg:overflow-y-auto">
              {blog.isEditPending ? (
                displayBlog.coverImage ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 border border-white/5 shadow-inner">
                    <Image src={displayBlog.coverImage} alt="Cover" fill className="object-cover" />
                  </div>
                ) : null
              ) : sanityPost?.image ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 border border-white/5 shadow-inner">
                  <img
                    src={urlFor(sanityPost.image).width(800).url()}
                    alt={sanityPost.image?.alt || displayBlog.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : displayBlog.coverImage ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 border border-white/5 shadow-inner">
                  <Image src={displayBlog.coverImage} alt="Cover" fill className="object-cover" />
                </div>
              ) : null}
              {(blog.isEditPending ? displayBlog.description : sanityPost?.description || displayBlog.description) && (
                <div className="mb-10 text-white/70 leading-relaxed text-lg sm:text-xl font-medium border-l-4 border-teal-500/40 pl-5 sm:pl-6 py-1">
                  {blog.isEditPending ? displayBlog.description : sanityPost?.description || displayBlog.description}
                </div>
              )}

              {blog.isEditPending && blog.pendingEdit && (
                <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                  Viewing <span className="font-semibold">requested edit</span> — not yet published. Approve or reject below.
                </div>
              )}

              <div className="max-w-none">
                {blog.isEditPending && blog.pendingEdit ? (
                  (() => {
                    try {
                      const inlineMap = new Map(
                        (displayBlog.inlineImages || []).map((img: any) => [
                          img.placeholder,
                          img.sanityAssetId || img.sanityUrl || img.base64,
                        ]),
                      );
                      // Also map bare placeholder without brackets for markdownToBlocks fallback
                      for (const img of displayBlog.inlineImages || []) {
                        const bare = (img.placeholder || "").slice(2, -1);
                        if (bare && !inlineMap.has(bare)) inlineMap.set(bare, img.sanityAssetId || img.sanityUrl || img.base64);
                      }
                      const blocks = markdownToBlocks(displayBlog.content || "", inlineMap as any);
                      if (blocks.length) return <PortableText value={blocks as any} components={portableComponents} />;
                    } catch {}
                    return null;
                  })()
                ) : sanityPost?.body ? (
                  <PortableText value={sanityPost.body} components={portableComponents} />
                ) : (
                  (() => {
                    try {
                      const inlineMap = new Map(
                        (displayBlog.inlineImages || []).map((img: any) => [img.placeholder, img.sanityAssetId || img.sanityUrl || img.base64]),
                      );
                      for (const img of displayBlog.inlineImages || []) {
                        const bare = (img.placeholder || "").slice(2, -1);
                        if (bare && !inlineMap.has(bare)) inlineMap.set(bare, img.sanityAssetId || img.sanityUrl || img.base64);
                      }
                      const blocks = markdownToBlocks(displayBlog.content || "", inlineMap as any);
                      if (blocks.length) return <PortableText value={blocks as any} components={portableComponents} />;
                    } catch {}
                    return (
                      <Markdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeRaw]}
                        urlTransform={(value) => value}
                        components={{
                          h1: ({ children }) => <h1 className="text-4xl sm:text-5xl font-black text-teal-400 mt-12 mb-6 border-b border-teal-500/20 pb-4 tracking-tight drop-shadow-[0_0_15px_rgba(45,212,191,0.3)]">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-3xl sm:text-4xl font-extrabold text-teal-300 mt-10 mb-5 tracking-tight">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-2xl sm:text-3xl font-bold text-teal-200/90 mt-8 mb-4">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-xl sm:text-2xl font-semibold text-teal-100/80 mt-6 mb-3">{children}</h4>,
                          h5: ({ children }) => <h5 className="text-lg sm:text-xl font-semibold text-teal-200 mt-4 mb-2">{children}</h5>,
                          h6: ({ children }) => <h6 className="text-base sm:text-lg font-semibold text-teal-300 mt-4 mb-2">{children}</h6>,
                          p: ({ children }) => <p className="text-gray-300 leading-relaxed my-4 text-lg">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside my-4 pl-2 text-gray-300 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside my-4 pl-2 text-gray-300 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="ml-2">{children}</li>,
                          del: ({ children }) => <span className="line-through decoration-teal-400/60">{children}</span>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-teal-500 pl-4 ml-2 italic text-gray-400 my-4">{children}</blockquote>,
                          pre: ({ children }) => <pre className="bg-[#04070c] border border-white/5 p-5 sm:p-6 rounded-2xl my-8 overflow-x-auto text-[0.9rem] cursor-pointer relative group shadow-lg" onClick={(e) => handleCopyCode(e.currentTarget.innerText)}>{children}</pre>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            if (isInline) return <code className="text-teal-300 px-1.5 py-0.5 rounded text-sm">{children}</code>;
                            return <code className="text-teal-300 text-sm block whitespace-pre">{children}</code>;
                          },
                          img: ({ src, alt, className }) => {
                            if (!src) return null;
                            return <img src={src as string} alt={alt || "Blog image"} className={className || "rounded-2xl border border-white/5 my-10 w-full shadow-2xl object-cover max-h-[600px]"} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />;
                          },
                        }}
                      >
                        {finalContent}
                      </Markdown>
                    );
                  })()
                )}
              </div>
            </div>

            <div className="p-6 sm:px-8 sm:py-7 border-t border-white/5 bg-[#0b1019]/90 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0 rounded-b-[28px]">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold">
                  {blog.author.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold mb-0.5">
                    Author
                  </p>
                  <p className="text-[1.1rem] font-bold text-white/90">
                    {blog.author.username}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">
                  Last Updated
                </p>
                <p className="text-[1.1rem] font-bold text-white/90">
                  {moment(blog.updatedAt).format("MMM D, YYYY [at] h:mm A")}
                </p>
              </div>
              <div className="w-full sm:w-auto sm:text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">
                  Slug
                </p>
                <p className="text-[1.1rem] font-bold text-teal-400 break-all">
                  {displayBlog.slug}
                </p>
              </div>
            </div>
          </motion.div>

          <aside className="flex flex-col gap-6 w-full lg:h-full lg:overflow-y-auto lg:pr-2">
            <AnimatePresence>
              {(blog.status === "pending" ||
                blog.deletionRequested ||
                blog.isEditPending) && (
                <motion.div
                  key="admin-actions"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#0b1019]/60 border border-white/10 rounded-[28px] p-6 backdrop-blur-xl ring-1 ring-teal-500/20 shadow-[0_0_30px_rgba(45,212,191,0.1)]"
                >
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-teal-400" /> Review
                    Actions
                  </h3>

                  <div className="space-y-4">
                    {blog.status === "pending" && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleApprove}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all text-sm"
                        >
                          <Check size={18} /> Approve
                        </button>
                        <button
                          onClick={handleReject}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/20 transition-all text-sm"
                        >
                          <X size={18} /> Reject
                        </button>
                      </div>
                    )}

                    {blog.deletionRequested && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleApproveDelete}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all text-sm"
                        >
                          <Trash2 size={18} /> Confirm Delete
                        </button>
                        <button
                          onClick={handleRejectDelete}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-bold hover:bg-white/10 transition-all text-sm"
                        >
                          <X size={18} /> Keep Blog
                        </button>
                      </div>
                    )}

                    {blog.isEditPending && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleApproveEdit}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-400 transition-all text-sm"
                        >
                          <Check size={18} /> Approve Edits
                        </button>
                        <button
                          onClick={handleRejectEdit}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/20 transition-all text-sm"
                        >
                          <X size={18} /> Reject Edits
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0b1019]/60 border border-white/5 rounded-[28px] p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-teal-400 rounded-full" /> Status
                  Overview
                </h3>
                {/* DIRECT DELETE BUTTON (Red text, subtle bg) */}
                <button
                  onClick={deleteBlogDirect}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                  title="Direct Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 text-white/50">
                    <Clock size={16} className="text-teal-400" /> Submitted On
                  </span>
                  <span className="text-white font-bold">
                    {moment(blog.createdAt).format("MMM D, YYYY")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 text-white/50">
                    <CheckCircle2 size={16} className="text-teal-400" /> Current
                    Status
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusColors[blog.status as keyof typeof statusColors]}`}
                  >
                    {blog.status}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0b1019]/60 border border-white/5 rounded-[28px] p-6 backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                <User size={20} className="text-teal-400" /> Author Details
              </h3>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">
                    Username
                  </p>
                  <p className="text-sm font-medium text-white/90">
                    {blog.author.username}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">
                    Email
                  </p>
                  <p className="text-sm font-medium text-teal-400/80 truncate">
                    {blog.author.email}
                  </p>
                </div>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
