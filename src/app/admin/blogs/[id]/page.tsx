"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import moment from "moment";
import { toast } from "react-hot-toast";

const R2_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

interface InlineImage {
  id: string;
  placeholder: string;
  r2Key?: string;
  r2Url?: string;
  strapiUrl?: string;
  strapiId?: number;
}

interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  description?: string;
  r2CoverKey?: string | null;
  r2CoverUrl?: string | null;
  coverImage?: string;
  coverImageName?: string;
  strapiCoverUrl?: string | null;
  inlineImages?: InlineImage[];
  categories: string[];
  author: {
    auth0Id: string;
    username: string;
    email: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  isEditPending?: boolean;
  pendingEdit?: {
    title: string;
    slug: string;
    content: string;
    description?: string;
    r2CoverKey?: string | null;
    r2CoverUrl?: string | null;
    coverImageName?: string;
    strapiCoverUrl?: string | null;
    inlineImages?: InlineImage[];
    categories: string[];
  };
}

const handleCopyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  } catch {
    toast.error("Copy failed");
  }
};

function resolveR2Url(
  r2Url?: string | null,
  r2Key?: string | null,
): string | null {
  if (r2Url) return r2Url;
  if (r2Key && R2_URL) return `${R2_URL}/${r2Key}`;
  return null;
}

export default function AdminBlogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const blogId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blogId) return;

    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/admin/blogs/${blogId}`);
        if (res.ok) {
          const data = await res.json();
          setBlog(data.blog);
        } else {
          const data = await res.json();
          setError(data.error || "Failed to fetch blog");
        }
      } catch {
        setError("Failed to fetch blog");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [blogId]);

  const getProcessedContent = (currentBlog: Blog) => {
    let content = currentBlog.content || "";

    if (currentBlog.inlineImages && currentBlog.inlineImages.length > 0) {
      currentBlog.inlineImages.forEach((img) => {
        if (!img.placeholder) return;

        const imgSrc =
          img.r2Url ||
          resolveR2Url(undefined, img.r2Key) ||
          img.strapiUrl ||
          (img.r2Key
            ? `/api/admin/r2-image?key=${encodeURIComponent(img.r2Key)}`
            : null);

        if (imgSrc && content.includes(img.placeholder)) {
          content = content
            .split(img.placeholder)
            .join(
              `<img src="${imgSrc}" alt="Inline Image" class="rounded-lg w-full my-4 object-cover" />`,
            );
        }
      });
    }

    return content;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-teal-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-red-500">{error || "Blog not found"}</p>
      </div>
    );
  }

  const displayBlog: Blog =
    blog.isEditPending && blog.pendingEdit
      ? {
          ...blog,
          title: blog.pendingEdit.title,
          slug: blog.pendingEdit.slug,
          content: blog.pendingEdit.content,
          description: blog.pendingEdit.description,
          r2CoverKey:
            blog.pendingEdit.r2CoverKey !== undefined
              ? blog.pendingEdit.r2CoverKey
              : blog.r2CoverKey,
          r2CoverUrl:
            blog.pendingEdit.r2CoverUrl !== undefined
              ? blog.pendingEdit.r2CoverUrl
              : blog.r2CoverUrl,
          strapiCoverUrl:
            blog.pendingEdit.strapiCoverUrl !== undefined
              ? blog.pendingEdit.strapiCoverUrl
              : blog.strapiCoverUrl,
          inlineImages:
            blog.pendingEdit.inlineImages ?? blog.inlineImages ?? [],
          categories: blog.pendingEdit.categories,
        }
      : blog;

  const coverSrc =
    resolveR2Url(displayBlog.r2CoverUrl, displayBlog.r2CoverKey) ||
    displayBlog.strapiCoverUrl ||
    displayBlog.coverImage ||
    null;

  const finalContent = getProcessedContent(displayBlog);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full min-h-screen bg-slate-950 text-gray-200"
    >
      <div className="max-w-3xl mx-auto p-6 pb-20">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl leading-[60px] text-center font-bold text-teal-400 capitalize"
        >
          {displayBlog.title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full flex items-center justify-center font-light text-gray-400 mt-1"
        >
          {blog.createdAt
            ? `Submitted ${moment(blog.createdAt).fromNow()}`
            : ""}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex justify-center mt-3"
        >
          <span
            className={`text-sm px-4 py-1 rounded border ${
              blog.status === "pending"
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500"
                : blog.status === "approved"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500"
                  : blog.status === "rejected"
                    ? "bg-red-500/20 text-red-400 border-red-500"
                    : "bg-green-500/20 text-green-400 border-green-500"
            }`}
          >
            {blog.status.toUpperCase()}
          </span>
        </motion.div>

        {blog.isEditPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-4 bg-blue-500/10 border border-blue-500/40 text-blue-300 px-4 py-3 rounded-lg text-sm text-center"
          >
            ✏️ <span className="font-semibold">Pending Edit Preview</span> — the
            content below reflects the author's requested changes, not the
            current live version.
          </motion.div>
        )}

        {displayBlog.categories && displayBlog.categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap space-x-2 my-4 justify-center"
          >
            {displayBlog.categories.map((name, index) => (
              <span
                key={index}
                className="border border-teal-800 text-teal-300 px-2 py-1 text-sm rounded bg-teal-950/40 font-medium"
              >
                {name}
              </span>
            ))}
          </motion.div>
        )}

        {coverSrc && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="relative h-72 w-full my-6"
          >
            <img
              src={coverSrc}
              alt={displayBlog.title}
              className="rounded-lg w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>
        )}

        {displayBlog.description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 leading-8 tracking-wide italic mt-2 mb-6 text-center"
          >
            {displayBlog.description}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="prose prose-invert max-w-none leading-relaxed"
        >
          <Markdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            urlTransform={(value) => value}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-teal-400 mt-10 mb-4 border-b border-teal-800 pb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-teal-300 mt-8 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-medium text-teal-200 mt-6 mb-2">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-lg font-medium text-teal-100 mt-4 mb-2">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-gray-300 leading-relaxed my-3">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside my-4 pl-2 text-gray-300 space-y-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside my-4 pl-2 text-gray-300 space-y-1">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="ml-2">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-teal-500 pl-4 ml-2 italic text-gray-400 my-4">
                  {children}
                </blockquote>
              ),
              u: ({ children }) => (
                <u className="underline decoration-teal-500">{children}</u>
              ),
              pre: ({ children }) => (
                <pre
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4 my-4 overflow-x-auto cursor-pointer relative group"
                  onClick={(e) => {
                    const text = e.currentTarget.innerText;
                    handleCopyCode(text);
                  }}
                >
                  {children}
                </pre>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="text-teal-300 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="text-teal-300 text-sm block whitespace-pre">
                    {children}
                  </code>
                );
              },
              img: ({ src, alt, className }) => {
                if (!src) return null;
                return (
                  <img
                    src={src as string}
                    alt={alt || "Blog image"}
                    className={
                      className ||
                      "rounded-lg w-full my-4 object-cover max-h-[500px]"
                    }
                    loading="lazy"
                    onError={(e) => {
                      console.error(
                        "Image failed to load:",
                        String(src).substring(0, 80),
                      );
                      e.currentTarget.style.display = "none";
                    }}
                  />
                );
              },
            }}
          >
            {finalContent}
          </Markdown>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center justify-center text-gray-400 font-light mb-6 mt-10 text-sm border-t border-gray-800 pt-6"
        >
          <p>
            Written by{" "}
            <span className="font-medium text-teal-300">
              {blog.author.username}
            </span>{" "}
            — {moment(blog.createdAt).fromNow()}
          </p>
          <p className="text-gray-400 mt-1">
            Contact:{" "}
            <span className="font-medium text-teal-500">
              {blog.author.email}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="w-full flex justify-center mt-8"
        >
          <button
            onClick={() => router.push("/admin/blogs")}
            className="text-teal-500 font-medium hover:underline"
          >
            ← Back to Pending Blogs
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
