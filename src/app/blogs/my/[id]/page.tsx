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
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  HelpCircle,
  ChevronRight,
  X,
} from "lucide-react";
import PyramidLoader from "@/components/PyramidLoader";

const CANCELLATION_WINDOW_MS = 10 * 60 * 1000;

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
    email?: string;
  };
  status: string;
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
    slug: string;
    content: string;
    description?: string;
    coverImage?: string;
    inlineImages?: InlineImage[];
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

export default function MyBlogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = typeof params?.id === "string" ? params.id : "";

  const [blog, setBlog] = useState<Blog | null>(null);
  const [sanityPost, setSanityPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mongoBlog, setMongoBlog] = useState<Blog | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const pendingDeletion = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!blogId) return;
    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/blogs/${blogId}`);
        if (!res.ok) throw new Error("Failed to fetch blog");
        const data = await res.json();
        const fetched: Blog = data.blog;
        setMongoBlog(fetched);

        if (fetched.deletionRequested && fetched.deletionRequestedAt) {
          setCountdown(getRemainingSeconds(fetched.deletionRequestedAt));
        }

        if (
          fetched.status === "published" &&
          fetched.isEditPending &&
          fetched.pendingEdit
        ) {
          setBlog({
            ...fetched,
            title: fetched.pendingEdit.title,
            slug: fetched.pendingEdit.slug,
            content: fetched.pendingEdit.content,
            description: fetched.pendingEdit.description,
            coverImage: fetched.pendingEdit.coverImage ?? fetched.coverImage,
            inlineImages: fetched.pendingEdit.inlineImages ?? [],
            categories: fetched.pendingEdit.categories,
          });
        } else {
          setBlog(fetched);
        }
        // If published with sanityId, fetch Sanity for accurate view (PortableText)
        const sid = (fetched as any)?.sanityId;
        if (sid && (fetched.status === "published" || fetched.status === "approved") && !fetched.isEditPending) {
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

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleCancelDeletion = async () => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/cancel-deletion`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Deletion request cancelled");
        setBlog((prev) =>
          prev ? { ...prev, deletionRequested: false } : null,
        );
        setCountdown(0);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel");
      }
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const handleDelete = async () => {
    if (!blog) return;
    const isPublished =
      blog.status === "published" || blog.status === "approved";

    if (isPublished) {
      if (!confirm("This blog is published. Send a deletion request to Admin?"))
        return;
      try {
        const res = await fetch(`/api/blogs/${blogId}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok && data.action === "requested") {
          toast.success("Deletion request sent");
          setBlog({
            ...blog,
            deletionRequested: true,
            deletionRequestedAt: data.deletionRequestedAt,
          });
          setCountdown(Math.ceil(CANCELLATION_WINDOW_MS / 1000));
        }
      } catch {
        toast.error("Request failed");
      }
      return;
    }

    if (!confirm("Are you sure you want to permanently delete this blog?"))
      return;

    let undone = false;
    const originalBlog = { ...blog };

    const toastId = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-100">
            Deleting blog...
          </span>
          <button
            onClick={() => {
              undone = true;
              if (pendingDeletion.current)
                clearTimeout(pendingDeletion.current);
              setBlog(originalBlog);
              setIsDeleting(false);
              toast.dismiss(t.id);
              toast.success("Deletion cancelled");
            }}
            className="text-teal-400 font-bold text-sm hover:underline"
          >
            Undo
          </button>
        </div>
      ),
      {
        duration: 10000,
        style: {
          background: "#1e293b",
          color: "#f1f5f9",
          border: "1px solid #334155",
        },
      },
    );

    setIsDeleting(true);

    pendingDeletion.current = setTimeout(async () => {
      if (undone) return;
      const res = await fetch(`/api/blogs/${blogId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/blogs");
      } else {
        toast.error("Permanent delete failed");
        setBlog(originalBlog);
        setIsDeleting(false);
      }
    }, 10000);
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

  const getProcessedContent = (currentBlog: Blog) => {
    let content = currentBlog.content || "";
    if (currentBlog.inlineImages && currentBlog.inlineImages.length > 0) {
      currentBlog.inlineImages.forEach((img) => {
        if (img.placeholder && img.base64) {
          const cleanBase64 = img.base64.trim();
          content = content
            .split(img.placeholder)
            .join(
              `<img src="${cleanBase64}" alt="Inline Image" class="rounded-lg w-full my-4 object-cover" />`,
            );
        }
      });
    }
    return content;
  };

  if (loading || isDeleting)
    return (
      <div className="min-h-screen bg-[#04070c] flex items-center justify-center">
        <PyramidLoader />
      </div>
    );
  if (error || (!blog && !loading && !pendingDeletion.current))
    return (
      <div className="min-h-screen bg-[#04070c] flex items-center justify-center text-red-500">
        {error || "Not found"}
      </div>
    );
  if (!blog) return <div className="min-h-screen bg-[#04070c]" />;

  const source = mongoBlog ?? blog;
  const isPublishedPost =
    blog.status === "published" || blog.status === "approved";
  const finalContent = getProcessedContent(blog);

  const statusColors = {
    draft: "text-gray-400 bg-gray-400/10 border-gray-400/20",
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
          onClick={() => router.push("/blogs")}
          className="group flex items-center gap-2 text-teal-400 font-semibold mb-8 hover:text-teal-300 transition-colors w-fit"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to My Blogs
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
                  {/* DYNAMIC BADGE LOGIC (Same as BlogsClient) */}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${statusColors[blog.status as keyof typeof statusColors] || "text-gray-400 border-white/10"}`}
                    >
                      {blog.status}
                    </span>
                    {blog.deletionRequested && (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Deletion Pending
                      </span>
                    )}
                    {blog.isEditPending && (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md bg-purple-500/20 text-purple-400 border-purple-500/30">
                        Editing
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    {blog.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {blog.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full text-xs font-semibold"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/blogs/edit/${blogId}`)}
                  className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold hover:bg-white/10 transition-all shrink-0"
                >
                  <Edit3 size={16} />{" "}
                  <span className="hidden sm:block">Edit Blog</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 sm:p-8 lg:overflow-y-auto">
              {sanityPost?.image ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 border border-white/5 shadow-inner">
                  <img src={urlFor(sanityPost.image).width(800).url()} alt={sanityPost.image?.alt || blog.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : blog.coverImage ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 border border-white/5 shadow-inner">
                  <Image src={blog.coverImage} alt="Cover" fill className="object-cover" />
                </div>
              ) : null}
              {(sanityPost?.description || blog.description) && (
                <div className="mb-10 text-white/70 leading-relaxed text-lg sm:text-xl font-medium border-l-4 border-teal-500/40 pl-5 sm:pl-6 py-1">
                  {sanityPost?.description || blog.description}
                </div>
              )}

              <div className="max-w-none">
                {sanityPost?.body ? (
                  <PortableText value={sanityPost.body} components={portableComponents} />
                ) : (
                  (() => {
                    try {
                      const inlineMap = new Map(
                        (blog.inlineImages || []).map((img: any) => [img.placeholder, img.sanityAssetId || img.sanityUrl || img.base64]),
                      );
                      for (const img of blog.inlineImages || []) {
                        const bare = (img.placeholder || "").slice(2, -1);
                        if (bare && !inlineMap.has(bare)) inlineMap.set(bare, img.sanityAssetId || img.sanityUrl || img.base64);
                      }
                      const blocks = markdownToBlocks(blog.content || "", inlineMap as any);
                      if (blocks.length) return <PortableText value={blocks as any} components={portableComponents} />;
                    } catch {}
                    return (
                      <Markdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeRaw]}
                        urlTransform={(value) => value}
                        components={{
                          h1: ({ children }) => <h1 className="text-3xl sm:text-5xl font-black text-teal-400 mt-12 mb-6 border-b border-teal-500/20 pb-4 tracking-tight drop-shadow-[0_0_15px_rgba(45,212,191,0.3)]">{children}</h1>,
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

            <div className="p-6 sm:px-8 sm:py-7 border-t border-white/5 bg-[#0b1019]/90 flex flex-col sm:flex-row justify-between gap-6 shrink-0 rounded-b-[28px]">
              <div>
                <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-white/30 font-bold mb-2">
                  Last Updated
                </p>
                <p className="text-[1.2rem] sm:text-[1.35rem] font-bold text-white/90">
                  {moment(blog.updatedAt).format("MMMM D, YYYY [at] h:mm A")}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-white/30 font-bold mb-2">
                  Slug
                </p>
                <p className="text-[1.2rem] sm:text-[1.35rem] font-bold text-teal-400 break-all">
                  {blog.slug}
                </p>
              </div>
            </div>
          </motion.div>

          <aside className="flex flex-col gap-6 w-full lg:h-full lg:overflow-y-auto lg:pr-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0b1019]/60 border border-white/5 rounded-[28px] p-6 backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-teal-400 rounded-full" /> Status
                Overview
              </h3>
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 mb-8">
                <div
                  className={`p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}
                >
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <p className="text-base font-bold capitalize">
                    {blog.status}
                  </p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    This blog is live and visible to readers.
                  </p>
                </div>
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
                    <CheckCircle2 size={16} className="text-teal-400" />{" "}
                    Approved On
                  </span>
                  <span className="text-white font-bold">
                    {moment(blog.updatedAt).format("MMM D, YYYY")}
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
                <div className="w-1.5 h-4 bg-red-500 rounded-full" /> Actions
              </h3>
              {blog.deletionRequested && countdown > 0 ? (
                <button
                  onClick={handleCancelDeletion}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 group hover:bg-yellow-500/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
                      <X size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-yellow-400">
                        Cancel Request
                      </p>
                      <p className="text-[11px] text-white/30">
                        Undo request ({formatCountdown(countdown)})
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-white/20 group-hover:translate-x-1 transition-transform"
                  />
                </button>
              ) : (
                <button
                  onClick={handleDelete}
                  disabled={blog.deletionRequested}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${blog.deletionRequested ? "bg-white/5 border-white/5 opacity-50 cursor-not-allowed" : "bg-red-500/5 border-red-500/10 group hover:bg-red-500/10"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${blog.deletionRequested ? "bg-white/10 text-white/40" : "bg-red-500/10 text-red-400"}`}
                    >
                      {blog.deletionRequested ? (
                        <Clock size={20} />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </div>
                    <div className="text-left">
                      <p
                        className={`text-sm font-bold ${blog.deletionRequested ? "text-white/60" : "text-red-400"}`}
                      >
                        {isPublishedPost
                          ? blog.deletionRequested
                            ? "Deletion Pending"
                            : "Request Deletion"
                          : "Delete Blog"}
                      </p>
                      <p className="text-[11px] text-white/30">
                        {isPublishedPost
                          ? blog.deletionRequested
                            ? "Waiting for admin approval"
                            : "Request admin to delete this blog"
                          : "Permanently delete this draft"}
                      </p>
                    </div>
                  </div>
                  {!blog.deletionRequested && (
                    <ChevronRight
                      size={18}
                      className="text-white/20 group-hover:translate-x-1 transition-transform"
                    />
                  )}
                </button>
              )}
            </motion.div>

            {/* ALERT BANNERS SECTION (Restored Legacy Reasons) */}
            <AnimatePresence>
              {/* 1. Blog Rejection Reason */}
              {blog.status === "rejected" && source.adminNotes && (
                <motion.div
                  key="blog-rejection" // <--- ADD THIS
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-[24px] border bg-red-500/10 border-red-500/20 text-red-400"
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> Notice
                  </p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Rejection reason:</span>{" "}
                    {source.adminNotes}
                  </p>
                </motion.div>
              )}

              {/* 2. Edit Pending Banner */}
              {source.isEditPending && blog.status === "published" && (
                <motion.div
                  key="edit-pending" // <--- ADD THIS
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-[24px] border bg-blue-500/10 border-blue-500/20 text-blue-400"
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Edit3 size={16} /> Review Active
                  </p>
                  <p className="text-sm leading-relaxed">
                    A new version is currently under admin review and not yet
                    live.
                  </p>
                </motion.div>
              )}

              {/* 3. Edit Rejection Reason */}
              {source.isEditRejected && source.adminNotes && (
                <motion.div
                  key="edit-rejection" // <--- ADD THIS
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-[24px] border bg-red-500/10 border-red-500/20 text-red-400"
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> Edit Rejected
                  </p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Reason:</span>{" "}
                    {source.adminNotes}
                  </p>
                </motion.div>
              )}

              {/* 4. Deletion Rejection Reason */}
              {source.isDeletionRejected && source.deletionRejectedNotes && (
                <motion.div
                  key="deletion-rejection" // <--- ADD THIS
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-[24px] border bg-orange-500/10 border-orange-500/20 text-orange-400"
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> Deletion Rejected
                  </p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Reason:</span>{" "}
                    {source.deletionRejectedNotes}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0b1019]/60 border border-white/5 rounded-[28px] p-6 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle size={22} className="text-teal-400" />
                <h3 className="text-lg font-bold">Need Help?</h3>
              </div>
              <p className="text-sm text-white/50 mb-6 leading-relaxed">
                If you have any questions regarding your blog, feel free to
                reach out.
              </p>
              <button
                onClick={() => router.push("/contact")}
                className="w-full py-3.5 rounded-xl border border-teal-500/30 text-teal-400 font-bold bg-teal-500/5 hover:bg-teal-500/10 transition-all text-sm"
              >
                Contact Support
              </button>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
