"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

function insertTextAtCursor(
  el: HTMLTextAreaElement,
  text: string,
  cursorOffset = 0,
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.substring(0, start);
  const after = el.value.substring(end);
  const newVal = before + text + after;

  el.value = newVal;
  el.focus();

  const newPos = start + text.length + cursorOffset;
  el.selectionStart = el.selectionEnd = newPos;

  el.dispatchEvent(new Event("input", { bubbles: true }));
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface InlineImage {
  id: string;
  base64: string;
  placeholder: string;
}

export default function EditBlogPage() {
  const router = useRouter();
  const { id } = useParams();

  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);
  const imageCounterRef = useRef(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/user/username")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then(setUser)
      .catch(() => router.push("/login"));

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        setLoadingCategories(false);
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
        setLoadingCategories(false);
      });

    if (id) {
      fetch(`/api/blogs/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.blog) {
            const source = data.blog.isEditPending
              ? data.blog.pendingEdit
              : data.blog;

            setTitle(source.title || "");
            setSlug(source.slug || "");
            setDescription(source.description || "");
            setContent(source.content || "");
            setSelectedCategories(source.categories || []);
            setCoverImage(source.coverImage || "");
            setImagePreview(source.coverImage || null);
            setInlineImages(source.inlineImages || []);

            imageCounterRef.current = source.inlineImages?.length || 0;
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, router]);

  function injectFilenameToDataUrl(dataUrl: string, filename: string) {
    const safe = encodeURIComponent(filename);
    return dataUrl.replace(
      /^data:(image\/[^;]+);base64,/,
      `data:$1;name=${safe};base64,`,
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("❌ Please select a valid image file");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage("❌ Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const rawBase64 = reader.result as string;
      const withName = injectFilenameToDataUrl(rawBase64, file.name);
      setCoverImage(withName);
      setImagePreview(withName);
      setMessage(null);
    };
    reader.onerror = () => setMessage("❌ Failed to read image file");
    reader.readAsDataURL(file);
  };

  const handleInlineImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("❌ Please select a valid image file");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage("❌ Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const rawBase64 = reader.result as string;
      const base64WithName = injectFilenameToDataUrl(rawBase64, file.name);

      const el = textareaRef.current;
      if (!el) return;

      imageCounterRef.current += 1;
      const imageId = `img_${imageCounterRef.current}`;
      const placeholder = `![image-${imageCounterRef.current}]`;

      const newImage: InlineImage = {
        id: imageId,
        base64: base64WithName,
        placeholder: placeholder,
      };
      setInlineImages((prev) => [...prev, newImage]);

      insertTextAtCursor(el, placeholder, 0);
      setContent(el.value);
      setMessage(null);
    };
    reader.onerror = () => setMessage("❌ Failed to read image file");
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const openInlineImagePicker = () => inlineImageInputRef.current?.click();

  const clearImage = () => {
    setCoverImage("");
    setImagePreview(null);
  };

  /* -------------------------------------------------------
     Submit Edits
  ------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return setMessage("You must be logged in to edit a blog.");
    if (!title.trim()) return setMessage("Title is required.");
    if (!slug.trim()) return setMessage("Slug is required.");
    if (!content.trim()) return setMessage("Content is required.");
    if (!description.trim()) return setMessage("Description is required.");
    if (selectedCategories.length === 0)
      return setMessage("Please select at least one category.");

    setSubmitting(true);
    setMessage(null);

    // Only send images whose placeholder is still in content
    const activeInlineImages = inlineImages.filter((img) =>
      content.includes(img.placeholder),
    );

    try {
      const res = await fetch(`/api/blogs/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
          description: description.trim(),
          coverImage: coverImage,
          inlineImages: activeInlineImages, // Only send active (non-orphaned) inline images
          categories: selectedCategories,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update blog");

      setMessage(
        data.isEditPending
          ? "✅ Edit submitted for admin review!"
          : "✅ Blog updated successfully!",
      );
      setTimeout(() => router.push("/blogs"), 1500);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function wrapSelection(start: string, end = "") {
    const el = textareaRef.current;
    if (!el) return;

    const selStart = el.selectionStart;
    const selEnd = el.selectionEnd;
    const selectedText = el.value.substring(selStart, selEnd);
    const before = el.value.substring(0, selStart);
    const after = el.value.substring(selEnd);
    const wrappedText = `${start}${selectedText}${end}`;
    const newValue = before + wrappedText + after;

    el.value = newValue;
    setContent(newValue);

    const cursorPos =
      selectedText === ""
        ? selStart + start.length
        : selStart + wrappedText.length;
    el.selectionStart = el.selectionEnd = cursorPos;
    el.focus();
  }

  function handleHeading(level: number) {
    const el = textareaRef.current;
    if (!el) return;

    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = el.value.indexOf("\n", pos);
    const actualLineEnd = lineEnd === -1 ? el.value.length : lineEnd;
    const prefix = "#".repeat(level) + " ";
    const lineContent = el.value.substring(lineStart, actualLineEnd);
    const cleanLine = lineContent.replace(/^#{1,6}\s*/, "");
    const newLine = prefix + cleanLine;
    const updated =
      el.value.substring(0, lineStart) +
      newLine +
      el.value.substring(actualLineEnd);

    el.value = updated;
    setContent(updated);

    const newCursorPos = lineStart + newLine.length;
    el.selectionStart = el.selectionEnd = newCursorPos;
    el.focus();
  }

  function insertBulletList() {
    const el = textareaRef.current;
    if (!el) return;
    insertTextAtCursor(el, "- ", 0);
    setContent(el.value);
  }

  function insertNumberedList() {
    const el = textareaRef.current;
    if (!el) return;
    insertTextAtCursor(el, "1. ", 0);
    setContent(el.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;

    const el = e.currentTarget;
    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = el.value.indexOf("\n", pos);
    const actualLineEnd = lineEnd === -1 ? el.value.length : lineEnd;
    const currentLine = el.value.substring(lineStart, actualLineEnd);

    const bulletMatch = currentLine.match(/^(\s*)-\s(.*)$/);
    if (bulletMatch) {
      const [, indent, text] = bulletMatch;
      if (text.trim() === "") {
        e.preventDefault();
        const before = el.value.substring(0, lineStart);
        const after = el.value.substring(actualLineEnd);
        el.value = before + after;
        setContent(el.value);
        el.selectionStart = el.selectionEnd = lineStart;
        return;
      }
      e.preventDefault();
      insertTextAtCursor(el, `\n${indent}- `, 0);
      setContent(el.value);
      return;
    }

    const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
    if (numberMatch) {
      const [, indent, num, text] = numberMatch;
      if (text.trim() === "") {
        e.preventDefault();
        const before = el.value.substring(0, lineStart);
        const after = el.value.substring(actualLineEnd);
        el.value = before + after;
        setContent(el.value);
        el.selectionStart = el.selectionEnd = lineStart;
        return;
      }
      e.preventDefault();
      const nextNum = parseInt(num) + 1;
      insertTextAtCursor(el, `\n${indent}${nextNum}. `, 0);
      setContent(el.value);
      return;
    }
  }

  const getCategoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name || slug;

  const availableCategories = categories.filter(
    (cat) => !selectedCategories.includes(cat.slug),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400">
        Loading...
      </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-slate-950 text-gray-100 px-6 py-12"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-teal-400 mb-6">Edit Blog</h1>

        <div className="bg-blue-500/10 border border-blue-500 text-blue-300 p-4 rounded-md mb-6">
          <p className="text-sm">
            ℹ️ If this blog is already published, your edits will be submitted
            for admin review before replacing the live version.
          </p>
        </div>

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
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800"
        >
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Your blog title"
              required
              minLength={10}
              maxLength={200}
              className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (10-300 characters)"
              required
              minLength={10}
              maxLength={300}
              className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used as the blog preview/excerpt
            </p>
          </div>

          {/* CATEGORIES */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              category ({selectedCategories.length})
            </label>

            {selectedCategories.length < 3 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && selectedCategories.length < 3) {
                    setSelectedCategories([
                      ...selectedCategories,
                      e.target.value,
                    ]);
                  }
                }}
                className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 outline-none mb-3"
                disabled={loadingCategories || availableCategories.length === 0}
              >
                <option value="">Add or create a relation</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            <div className="space-y-2">
              {selectedCategories.map((catSlug) => (
                <div
                  key={catSlug}
                  className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-md group hover:border-teal-500 transition"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    <span className="text-gray-200">
                      {getCategoryName(catSlug)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategories(
                        selectedCategories.filter((c) => c !== catSlug),
                      )
                    }
                    className="text-gray-500 hover:text-red-400 transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              {selectedCategories.length === 0 && "Select at least 1 category"}
              {selectedCategories.length > 0 &&
                selectedCategories.length < 3 &&
                `You can select ${3 - selectedCategories.length} more`}
              {selectedCategories.length === 3 &&
                "Maximum 3 categories selected"}
            </p>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-blog-post (URL-friendly, lowercase, no spaces)"
              required
              pattern="[a-z0-9-]+"
              className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used in URL: yoursite.com/blog/
              <strong>{slug || "slug"}</strong>
            </p>
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Cover Image (Optional)
            </label>

            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-700 rounded-md p-6 text-center hover:border-teal-500 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="cover-image-upload"
                />
                <label
                  htmlFor="cover-image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-600 mb-3"
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
                  <span className="text-sm text-gray-400">
                    Click to upload cover image
                  </span>
                  <span className="text-xs text-gray-600 mt-1">
                    Max size: 2MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="w-full h-64 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full transition"
                  title="Remove image"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Markdown Editor */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Content <span className="text-red-500">*</span>
            </label>

            {/* Count reflects only active (non-orphaned) inline images */}
            {inlineImages.filter((img) => content.includes(img.placeholder))
              .length > 0 && (
              <div className="mb-2 text-xs text-gray-500">
                📷{" "}
                {
                  inlineImages.filter((img) =>
                    content.includes(img.placeholder),
                  ).length
                }{" "}
                inline image
                {inlineImages.filter((img) => content.includes(img.placeholder))
                  .length !== 1
                  ? "s"
                  : ""}{" "}
                added
              </div>
            )}

            <div className="bg-slate-900 border border-gray-800 rounded-md">
              <div className="flex flex-wrap gap-2 p-2 border-b border-gray-800 text-sm">
                <button
                  onClick={() => wrapSelection("**", "**")}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800 font-bold"
                >
                  B
                </button>
                <button
                  onClick={() => wrapSelection("_", "_")}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800 italic"
                >
                  I
                </button>
                <button
                  onClick={() => wrapSelection("<u>", "</u>")}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800 underline"
                >
                  U
                </button>
                <button
                  onClick={() => wrapSelection("~~", "~~")}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800 line-through"
                >
                  S
                </button>

                <div className="w-px bg-gray-700"></div>

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
                  onClick={() => handleHeading(4)}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800"
                >
                  H4
                </button>

                <div className="w-px bg-gray-700"></div>

                <button
                  onClick={insertBulletList}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800"
                  title="Bulleted list"
                >
                  •
                </button>
                <button
                  onClick={insertNumberedList}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800"
                  title="Numbered list"
                >
                  1.
                </button>

                <div className="w-px bg-gray-700"></div>

                <button
                  onClick={() => wrapSelection("> ")}
                  type="button"
                  className="px-3 py-1 rounded hover:bg-slate-800"
                >
                  Quote
                </button>

                <button
                  type="button"
                  onClick={() => wrapSelection("```\n", "\n```")}
                  className="px-3 py-1 rounded hover:bg-slate-800"
                >
                  Code
                </button>

                <div className="w-px bg-gray-700"></div>

                <button
                  type="button"
                  onClick={openInlineImagePicker}
                  className="px-3 py-1 rounded hover:bg-slate-800 flex items-center gap-1"
                  title="Insert image"
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Image
                </button>

                <input
                  ref={inlineImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInlineImageUpload}
                  className="hidden"
                />
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setContent(newContent);
                  // Real-time: prune inline images no longer referenced in content
                  setInlineImages((prev) =>
                    prev.filter((img) => newContent.includes(img.placeholder)),
                  );
                }}
                onKeyDown={handleKeyDown}
                placeholder="Write your blog content here (minimum 100 characters)..."
                required
                minLength={100}
                className="w-full p-4 h-72 bg-slate-900 text-gray-100 resize-vertical rounded-b-md outline-none font-mono text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </motion.main>
  );
}
