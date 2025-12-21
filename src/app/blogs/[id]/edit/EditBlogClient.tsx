"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAuthData, getAuthToken } from "@/lib/strapiAuth";

const STRAPI_BASE =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

// Insert text
function insertTextAtCursor(el: HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.substring(0, start) + text + el.value.substring(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Fetch categories
async function fetchCategories() {
  const res = await fetch(
    `${STRAPI_BASE}/api/categories?fields=name,documentId`,
    { cache: "no-store" }
  );
  const json = await res.json();
  return json?.data || [];
}

export default function EditBlogClient({ blog }: { blog: any }) {
  const router = useRouter();

  const [auth, setAuth] = useState<any | null>(null);
  const [title, setTitle] = useState(blog.title || "");
  const [description, setDescription] = useState(blog.description || "");
  const [content, setContent] = useState(blog.content || "");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    blog.category?.map((c: any) => c.documentId) || []
  );

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  // Load auth + categories
  useEffect(() => {
    const stored = getAuthData();
    if (!stored) router.push("/login");
    else setAuth(stored);

    fetchCategories().then(setCategories);
  }, [router]);

  // Upload file
  async function uploadFile(file: File) {
    const token = getAuthToken();
    const form = new FormData();
    form.append("files", file);

    const res = await fetch(`${STRAPI_BASE}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });

    if (!res.ok) throw new Error("Image upload failed");
    return await res.json();
  }

  // Update blog
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    setMsg(null);

    try {
      let coverId = null;

      if (coverFile) {
        const uploaded = await uploadFile(coverFile);
        coverId = uploaded?.[0]?.id || null;
      }

      const token = getAuthToken();

      const payload: any = {
        data: {
          title: title.trim(),
          description: description.trim(),
          content,
          category: selectedCategories, // 100% correct key for REST
        },
      };

      if (coverId) payload.data.cover = coverId;

      const res = await fetch(`${STRAPI_BASE}/api/blogs/${blog.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || "Update failed");

      setMsg("Blog updated successfully.");
      setTimeout(() => router.push(`/blogs/${blog.documentId}`), 900);
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Inline image upload
  async function handleInlineImage() {
    const file = inlineImageInputRef.current?.files?.[0];
    if (!file || !textareaRef.current) return;

    try {
      const uploaded = await uploadFile(file);
      const img = uploaded?.[0];
      const url = img.url.startsWith("http")
        ? img.url
        : `${STRAPI_BASE}${img.url}`;

      insertTextAtCursor(textareaRef.current, `![img](${url})`);
      setContent(textareaRef.current.value);
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-teal-400 mb-6">Edit Blog</h1>

        {msg && (
          <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500 rounded-md">
            {msg}
          </div>
        )}

        <form
          onSubmit={handleUpdate}
          className="flex flex-col gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blog Title"
            className="p-3 rounded-md bg-gray-800 border border-gray-700"
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="p-3 rounded-md bg-gray-800 border border-gray-700"
          />

          {/* Categories */}
          <div className="bg-slate-900 p-4 rounded-md border border-gray-800">
            <p className="text-sm text-gray-400 mb-2">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat: any) => {
                const selected = selectedCategories.includes(cat.documentId);
                return (
                  <button
                    key={cat.documentId}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        selected
                          ? prev.filter((id) => id !== cat.documentId)
                          : [...prev, cat.documentId]
                      )
                    }
                    className={`px-3 py-1 text-sm rounded-md border ${
                      selected
                        ? "bg-teal-600 border-teal-500 text-black"
                        : "bg-slate-800 border-gray-700 text-gray-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write content..."
            className="w-full p-4 h-72 bg-slate-900 border border-gray-800 rounded-md"
          />

          {/* Inline image */}
          <input
            ref={inlineImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInlineImage}
          />
          <button
            type="button"
            onClick={() => inlineImageInputRef.current?.click()}
            className="bg-slate-800 p-2 rounded-md border border-gray-700"
          >
            Insert Inline Image
          </button>

          {/* Cover image */}
          <label className="file:bg-teal-600 file:px-4 file:py-2 file:text-black file:rounded-md bg-slate-900 rounded-md p-3 border border-gray-800 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {coverFile ? "New cover selected ✓" : "Change Cover Image"}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="bg-teal-500 hover:bg-teal-400 text-black font-semibold py-3 rounded-md"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
