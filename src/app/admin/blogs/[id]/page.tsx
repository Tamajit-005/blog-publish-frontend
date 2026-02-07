//src/app/admin/blogs/[id]/page.tsx
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

interface InlineImage {
  id: string;
  placeholder: string;
  base64: string;
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
    auth0Id: string;
    username: string;
    email: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

const handleCopyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  } catch (err) {
    toast.error("Copy failed");
  }
};

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
      } catch (err) {
        setError("Failed to fetch blog");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [blogId]);

  // Process content to inject inline images
  const getProcessedContent = (currentBlog: Blog) => {
    let content = currentBlog.content || "";

    if (currentBlog.inlineImages && currentBlog.inlineImages.length > 0) {
      currentBlog.inlineImages.forEach((img) => {
        if (img.placeholder && img.base64) {
          const cleanBase64 = img.base64.trim();

          // Inject raw HTML for inline images
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

  // Generate content with images injected
  const finalContent = getProcessedContent(blog);

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
          {blog.title}
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

        {/* STATUS BADGE */}
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

        {/* CATEGORIES */}
        {blog.categories && blog.categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap space-x-2 my-4 justify-center"
          >
            {blog.categories.map((name, index) => (
              <span
                key={index}
                className="border border-teal-800 text-teal-300 px-2 py-1 text-sm rounded bg-teal-950/40 font-medium"
              >
                {name}
              </span>
            ))}
          </motion.div>
        )}

        {/* COVER IMAGE */}
        {blog.coverImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="relative h-72 w-full my-6"
          >
            <img
              src={blog.coverImage}
              alt={blog.title}
              className="rounded-lg w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* DESCRIPTION */}
        {blog.description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 leading-8 tracking-wide italic mt-2 mb-6 text-center"
          >
            {blog.description}
          </motion.p>
        )}

        {/* CONTENT */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="prose prose-invert max-w-none leading-relaxed"
        >
          <Markdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            // Allows data:image URLs to be rendered
            urlTransform={(value) => value}
            components={{
              /* HEADINGS */
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

              /* TEXT */
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

              /* FORMATTING */
              u: ({ children }) => (
                <u className="underline decoration-teal-500">{children}</u>
              ),

              /* CODE BLOCK CONTAINER */
              pre: ({ children }) => {
                return (
                  <pre
                    className="bg-slate-900 border border-slate-800 rounded-lg p-4 my-4 overflow-x-auto cursor-pointer relative group"
                    onClick={(e) => {
                      const text = e.currentTarget.innerText;
                      handleCopyCode(text);
                    }}
                  >
                    {children}
                  </pre>
                );
              },

              /* CODE TEXT */
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

              /* IMAGES */
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
                      const safeSrc = String(src);
                      console.error(
                        "Image failed to load:",
                        safeSrc.substring(0, 50) + "...",
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

        {/* AUTHOR INFO */}
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

        {/* BACK BUTTON */}
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
