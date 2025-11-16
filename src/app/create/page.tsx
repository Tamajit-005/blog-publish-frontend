"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAuthData, getAuthToken } from "@/lib/strapiAuth";

const STRAPI_BASE =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

/* -------------------------------------------------------
   Helper: Insert text at cursor
------------------------------------------------------- */
function insertTextAtCursor(
  el: HTMLTextAreaElement,
  text: string,
  selectInserted = false
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.substring(0, start);
  const after = el.value.substring(end);
  const newVal = before + text + after;

  el.value = newVal;

  const cursorPos = selectInserted ? start : start + text.length;
  el.focus();
  el.selectionStart = el.selectionEnd = cursorPos;

  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/* -------------------------------------------------------
   Fetch categories from Strapi
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
   Page Component
------------------------------------------------------- */
export default function CreateBlogPage() {
  const router = useRouter();

  const [auth, setAuth] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  // CATEGORY STATE
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  /* -------------------------------------------------------
     Check login + Load categories
  ------------------------------------------------------- */
  useEffect(() => {
    const stored = getAuthData();
    if (!stored) router.push("/login");
    else setAuth(stored);

    fetchCategories().then((data) => setCategories(data));
  }, [router]);

  /* -------------------------------------------------------
     Upload file to Strapi (inline upload + cover)
  ------------------------------------------------------- */
  async function uploadFileToStrapi(file: File) {
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
     Publish blog
  ------------------------------------------------------- */
  async function handlePublish(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!auth) return setMessage("You must be logged in to publish.");
    if (!title.trim()) return setMessage("Title is required.");

    setLoading(true);
    setMessage(null);

    try {
      let coverRelation: number | null = null;

      if (coverFile) {
        const uploaded = await uploadFileToStrapi(coverFile);
        coverRelation = uploaded?.[0]?.id || null;
      }

      const token = getAuthToken();
      const payload: any = {
        data: {
          title: title.trim(),
          description: description.trim(),
          content,
          category: selectedCategories,
        },
      };

      if (coverRelation) payload.data.cover = coverRelation;

      const res = await fetch(`${STRAPI_BASE}/api/blogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || "Publish failed");

      setMessage("✅ Blog published successfully!");
      router.refresh();
      setTimeout(() => router.push("/blogs"), 900);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------
     Formatting helpers
  ------------------------------------------------------- */
  function wrapSelection(start: string, end = "", placeholder = "") {
    const el = textareaRef.current;
    if (!el) return;

    const sel = el.value.substring(el.selectionStart, el.selectionEnd);
    const text = `${start}${sel || placeholder}${end}`;

    insertTextAtCursor(el, text, true);
    setContent(el.value);
  }

  function handleHeading(level: number) {
    const el = textareaRef.current;
    if (!el) return;

    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", pos - 1) + 1;

    const prefix = "#".repeat(level) + " ";
    const updated =
      el.value.substring(0, lineStart) + prefix + el.value.substring(lineStart);

    el.value = updated;
    setContent(updated);
  }

  /* -------------------------------------------------------
     Inline Image Upload
  ------------------------------------------------------- */
  async function handleInlineImagePick(file?: File) {
    const f = file ?? inlineImageInputRef.current?.files?.[0];
    if (!f || !textareaRef.current) return;

    setUploadingImage(true);

    try {
      const uploaded = await uploadFileToStrapi(f);
      const img = uploaded?.[0];
      if (!img) throw new Error("Upload failed");

      const url = img.url.startsWith("http")
        ? img.url
        : `${STRAPI_BASE}${img.url}`;

      const alt = f.name.replace(/\.[^/.]+$/, "");

      insertTextAtCursor(textareaRef.current, `![${alt}](${url})`);
      setContent(textareaRef.current.value);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setUploadingImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
    }
  }

  function handleInlineImageButton() {
    inlineImageInputRef.current?.click();
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <motion.main
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-teal-400 mb-6">
          Create a New Blog
        </h1>

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
          onSubmit={handlePublish}
          className="flex flex-col gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800"
        >
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blog Title"
            required
            className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400"
          />

          {/* Description */}
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400"
          />

          {/* Categories */}
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
                        ? "bg-teal-600 border-teal-500 text-black"
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
              <button
                onClick={() => wrapSelection("**", "**")}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                Bold
              </button>
              <button
                onClick={() => wrapSelection("_", "_")}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                Italic
              </button>
              <button
                onClick={() => wrapSelection("<u>", "</u>")}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                Underline
              </button>
              <button
                onClick={() => wrapSelection("~~", "~~")}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                Strike
              </button>

              <button
                onClick={() => handleHeading(1)}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                H1
              </button>
              <button
                onClick={() => handleHeading(2)}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                H2
              </button>
              <button
                onClick={() => handleHeading(3)}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                H3
              </button>

              <button
                onClick={() => wrapSelection("> ")}
                type="button"
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                Quote
              </button>

              <button
                type="button"
                onClick={() =>
                  wrapSelection("```\n", "\n```", "your code here")
                }
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                Code
              </button>

              <button
                type="button"
                onClick={handleInlineImageButton}
                disabled={uploadingImage}
                className="px-3 py-1 rounded hover:bg-slate-800"
              >
                {uploadingImage ? "Uploading..." : "Image"}
              </button>

              <input
                ref={inlineImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => handleInlineImagePick()}
              />
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog content here..."
              className="w-full p-4 h-72 bg-slate-900 text-gray-100 resize-vertical rounded-b-md outline-none"
            />
          </div>

          {/* Cover Image */}
          <label className="file:bg-teal-600 file:hover:bg-teal-500 file:border-none file:rounded-md file:px-4 file:py-2 file:text-black file:font-semibold text-sm bg-slate-900 rounded-md cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {coverFile ? "Cover Selected ✓" : "Choose Cover Image"}
          </label>

          {/* Publish Button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold py-3 rounded-md transition"
          >
            {loading ? "Publishing..." : "Publish Blog"}
          </button>
        </form>
      </div>
    </motion.main>
  );
}
