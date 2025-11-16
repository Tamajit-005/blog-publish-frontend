"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAuthData, getAuthToken } from "@/lib/strapiAuth";

const STRAPI_BASE =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

/* -------------------------------------------------------
   Insert text at cursor
------------------------------------------------------- */
function insertTextAtCursor(
  el: HTMLTextAreaElement,
  text: string,
  selectInserted = false
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const newVal = before + text + after;

  el.value = newVal;

  const cursorPos = selectInserted ? start : start + text.length;
  el.focus();
  el.selectionStart = el.selectionEnd = cursorPos;

  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/* -------------------------------------------------------
   Fetch categories
------------------------------------------------------- */
async function fetchCategories() {
  const res = await fetch(
    `${STRAPI_BASE}/api/categories?fields=name,documentId`,
    { cache: "no-store" }
  );

  const json = await res.json();
  return json?.data || [];
}

/* -------------------------------------------------------
   Component
------------------------------------------------------- */
export default function EditBlogClient({ blog }: { blog: any }) {
  const router = useRouter();

  const [auth, setAuth] = useState<any | null>(null);
  const [title, setTitle] = useState(blog.title);
  const [description, setDescription] = useState(blog.description ?? "");
  const [content, setContent] = useState(blog.content ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    blog.categories?.map((c: any) => c.documentId) || []
  );

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInput = useRef<HTMLInputElement | null>(null);

  /* -------------------------------------------------------
     Init: auth + category list
  ------------------------------------------------------- */
  useEffect(() => {
    const stored = getAuthData();
    if (!stored) router.push("/login");
    else setAuth(stored);

    fetchCategories().then((data) => setCategories(data));
  }, [router]);

  /* -------------------------------------------------------
     Upload file to Strapi
  ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     UPDATE BLOG (REST)
  ------------------------------------------------------- */
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return setMessage("You must be logged in.");

    setLoading(true);
    setMessage(null);

    try {
      let coverId = null;

      if (coverFile) {
        const uploaded = await uploadFile(coverFile);
        coverId = uploaded?.[0]?.id || null;
      }

      const token = getAuthToken();

      const payload: any = {
        data: {
          title,
          description,
          content,

          // FIXED → REST uses categories (plural)
          categories: selectedCategories,
        },
      };

      if (coverId) payload.data.cover = coverId;

      const res = await fetch(`${STRAPI_BASE}/api/blogs/${blog.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message || "Update failed");

      setMessage("✅ Blog updated successfully!");

      setTimeout(() => {
        router.push(`/blogs/${blog.documentId}`);
      }, 800);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------
     Markdown formatting
  ------------------------------------------------------- */
  function wrap(start: string, end = "") {
    const el = textareaRef.current;
    if (!el) return;

    const sel = el.value.substring(el.selectionStart, el.selectionEnd);
    insertTextAtCursor(el, start + sel + end);
    setContent(el.value);
  }

  function insertHeading(level: number) {
    const el = textareaRef.current;
    if (!el) return;

    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", pos - 1) + 1;

    const prefix = "#".repeat(level) + " ";
    const updated =
      el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart);

    el.value = updated;
    setContent(updated);
  }

  async function handleInlineImagePick() {
    const file = inlineImageInput.current?.files?.[0];
    if (!file || !textareaRef.current) return;

    setUploadingImage(true);

    try {
      const uploaded = await uploadFile(file);
      const img = uploaded?.[0];
      if (!img) throw new Error("Upload failed");

      const url = img.url.startsWith("http")
        ? img.url
        : `${STRAPI_BASE}${img.url}`;

      const alt = file.name.replace(/\.[^/.]+$/, "");

      insertTextAtCursor(textareaRef.current, `![${alt}](${url})`);
      setContent(textareaRef.current.value);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setUploadingImage(false);
      inlineImageInput.current!.value = "";
    }
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-teal-400 mb-6">Edit Blog</h1>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md text-center ${
              message.startsWith("✅")
                ? "bg-teal-500/20 border border-teal-500 text-teal-300"
                : "bg-red-500/20 border border-red-500 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleUpdate}
          className="flex flex-col gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800"
        >
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400"
            placeholder="Title"
            required
          />

          {/* Description */}
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400"
            placeholder="Short description"
          />

          {/* Category Selector */}
          <div className="bg-slate-900 p-4 rounded-md border border-gray-800">
            <p className="text-sm text-gray-400 mb-2">Categories</p>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat: any) => {
                const isSelected = selectedCategories.includes(cat.documentId);
                return (
                  <button
                    key={cat.documentId}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== cat.documentId)
                          : [...prev, cat.documentId]
                      )
                    }
                    className={`px-3 py-1 text-sm rounded-md border ${
                      isSelected
                        ? "bg-teal-600 border-teal-300 text-black"
                        : "bg-slate-800 border-gray-700 text-gray-300 hover:border-teal-400"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Markdown Editor */}
          <div className="bg-slate-900 border border-gray-800 rounded-md">
            <div className="flex flex-wrap gap-2 p-2 border-b border-gray-800 text-sm">
              <button onClick={() => wrap("**", "**")} type="button">
                Bold
              </button>
              <button onClick={() => wrap("_", "_")} type="button">
                Italic
              </button>
              <button onClick={() => wrap("<u>", "</u>")} type="button">
                Underline
              </button>
              <button onClick={() => wrap("~~", "~~")} type="button">
                Strike
              </button>

              <button onClick={() => insertHeading(1)} type="button">
                H1
              </button>
              <button onClick={() => insertHeading(2)} type="button">
                H2
              </button>
              <button onClick={() => insertHeading(3)} type="button">
                H3
              </button>

              <button onClick={() => wrap("> ")} type="button">
                Quote
              </button>

              <button type="button" onClick={() => wrap("```\n", "\n```")}>
                Code
              </button>

              <button
                type="button"
                onClick={() => inlineImageInput.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? "Uploading..." : "Image"}
              </button>

              <input
                ref={inlineImageInput}
                type="file"
                accept="image/*"
                onChange={handleInlineImagePick}
                className="hidden"
              />
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 h-72 bg-slate-900 text-gray-100 rounded-b-md outline-none"
            />
          </div>

          {/* Cover Upload */}
          <label className="file:bg-teal-600 file:hover:bg-teal-500 file:px-4 file:py-2 file:text-black file:font-semibold text-sm bg-slate-900 rounded-md cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {coverFile ? "New Cover Selected ✓" : "Change Cover Image"}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold py-3 rounded-md transition"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
