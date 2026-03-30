"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

function ValidationWarning({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mt-2 flex items-start gap-2 bg-[#fff8e7] border border-[#f0c040] text-[#333] text-sm px-3 py-2 rounded shadow-md"
    >
      <span className="text-base leading-none mt-0.5">⚠️</span>
      <span>{message}</span>
    </motion.div>
  );
}

// Shows remaining characters; warns when near or at the limit
function CharCount({ current, max }: { current: number; max: number }) {
  const remaining = max - current;
  if (current === 0) return null;
  const color =
    remaining === 0
      ? "text-red-400"
      : remaining <= 20
        ? "text-yellow-400"
        : "text-gray-400";
  return (
    <p className={`text-xs mt-1 text-right ${color}`}>
      {remaining === 0
        ? `Character limit reached (${max}/${max})`
        : `${current}/${max}`}
    </p>
  );
}

function SuccessModal({
  message,
  onOk,
}: {
  message: string;
  onOk: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 border-b border-gray-200">
          <p className="font-bold text-gray-900 text-base">
            {typeof window !== "undefined"
              ? window.location.host
              : "localhost:3000"}{" "}
            says
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-3">
          <button
            onClick={onOk}
            className="px-6 py-1.5 rounded-full bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium transition"
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
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
  strapiUrl?: string;
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

  // ── Image-specific validation warnings ──────────────────────────
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const [inlineImageError, setInlineImageError] = useState<string | null>(null);

  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

  const [showErrors, setShowErrors] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
      setCoverImageError("Please select a valid image file.");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setCoverImageError("Image size must be less than 2MB.");
      return;
    }

    // Clear any previous error on successful pick
    setCoverImageError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const rawBase64 = reader.result as string;
      const withName = injectFilenameToDataUrl(rawBase64, file.name);
      setCoverImage(withName);
      setImagePreview(withName);
    };
    reader.onerror = () => setCoverImageError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const handleInlineImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setInlineImageError("Please select a valid image file.");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setInlineImageError("Image size must be less than 2MB.");
      return;
    }

    // Clear any previous error on successful pick
    setInlineImageError(null);

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
    };
    reader.onerror = () => setInlineImageError("Failed to read image file.");
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const openInlineImagePicker = () => inlineImageInputRef.current?.click();

  const clearImage = () => {
    setCoverImage("");
    setImagePreview(null);
    setCoverImageError(null);
  };

  function getTitleError(): string | null {
    if (title.trim().length === 0) return "Please fill in this field.";
    if (title.trim().length < 10)
      return `Please lengthen this text to 10 characters or more (you are currently using ${title.trim().length} character${title.trim().length !== 1 ? "s" : ""}).`;
    return null;
  }

  function getDescriptionError(): string | null {
    if (description.trim().length === 0) return "Please fill in this field.";
    if (description.trim().length < 10)
      return `Please lengthen this text to 10 characters or more (you are currently using ${description.trim().length} character${description.trim().length !== 1 ? "s" : ""}).`;
    return null;
  }

  function getContentError(): string | null {
    if (content.trim().length === 0) return "Please fill in this field.";
    if (content.trim().length < 100)
      return `Please lengthen this text to 100 characters or more (you are currently using ${content.trim().length} character${content.trim().length !== 1 ? "s" : ""}).`;
    return null;
  }

  function getCategoryError(): string | null {
    if (selectedCategories.length === 0)
      return "Please select at least one category.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return setMessage("You must be logged in to edit a blog.");

    setShowErrors(true);

    const firstErrorRef = getTitleError()
      ? titleRef
      : getDescriptionError()
        ? descriptionRef
        : getCategoryError()
          ? categoryRef
          : getContentError()
            ? contentRef
            : null;

    if (firstErrorRef?.current) {
      setTimeout(() => {
        firstErrorRef.current!.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }

    if (
      getTitleError() ||
      getDescriptionError() ||
      getCategoryError() ||
      getContentError() ||
      !slug.trim()
    )
      return;

    setSubmitting(true);
    setMessage(null);

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
          inlineImages: activeInlineImages,
          categories: selectedCategories,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update blog");

      setSuccessModal({
        visible: true,
        message: data.isEditPending
          ? "Your edit has been submitted for admin review before replacing the live version."
          : "Your blog has been updated successfully.",
      });
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
    <>
      <AnimatePresence>
        {successModal.visible && (
          <SuccessModal
            message={successModal.message}
            onOk={() => {
              setSuccessModal({ visible: false, message: "" });
              router.push("/blogs");
            }}
          />
        )}
      </AnimatePresence>

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
            <div className="mb-4 p-3 rounded-md text-center bg-red-500/20 border border-red-500 text-red-300">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800"
          >
            {/* Title */}
            <div ref={titleRef}>
              <label className="block text-sm text-gray-400 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your blog title"
                maxLength={200}
                className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 outline-none"
              />
              {/* Live character counter — warns at 180+, red at 200 */}
              <CharCount current={title.length} max={200} />
              <AnimatePresence>
                {showErrors && getTitleError() && (
                  <ValidationWarning
                    key="title-err"
                    message={getTitleError()!}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Description */}
            <div ref={descriptionRef}>
              <label className="block text-sm text-gray-400 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (10-300 characters)"
                maxLength={300}
                className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-teal-400 outline-none"
              />
              {/* Live character counter — warns at 280+, red at 300 */}
              <CharCount current={description.length} max={300} />
              <AnimatePresence>
                {showErrors && getDescriptionError() && (
                  <ValidationWarning
                    key="desc-err"
                    message={getDescriptionError()!}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Categories */}
            <div ref={categoryRef}>
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
                  disabled={
                    loadingCategories || availableCategories.length === 0
                  }
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
                {selectedCategories.length === 0 &&
                  "Select at least 1 category"}
                {selectedCategories.length > 0 &&
                  selectedCategories.length < 3 &&
                  `You can select ${3 - selectedCategories.length} more`}
                {selectedCategories.length === 3 &&
                  "Maximum 3 categories selected"}
              </p>
              <AnimatePresence>
                {showErrors && getCategoryError() && (
                  <ValidationWarning
                    key="cat-err"
                    message={getCategoryError()!}
                  />
                )}
              </AnimatePresence>
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

              {/* ── Cover image warning ── */}
              <AnimatePresence>
                {coverImageError && (
                  <ValidationWarning
                    key="cover-img-err"
                    message={coverImageError}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Markdown Editor */}
            <div ref={contentRef}>
              <label className="block text-sm text-gray-400 mb-2">
                Content <span className="text-red-500">*</span>
              </label>

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
                  {inlineImages.filter((img) =>
                    content.includes(img.placeholder),
                  ).length !== 1
                    ? "s"
                    : ""}{" "}
                  added
                </div>
              )}

              {/* Toolbar */}
              <div className="bg-slate-900 border border-gray-800 rounded-md">
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-gray-800">
                  <div className="flex items-center gap-1 p-2 text-sm min-w-max md:min-w-0 md:flex-wrap">
                    <button
                      onClick={() => wrapSelection("**", "**")}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 font-bold shrink-0"
                    >
                      B
                    </button>
                    <button
                      onClick={() => wrapSelection("_", "_")}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 italic shrink-0"
                    >
                      I
                    </button>
                    <button
                      onClick={() => wrapSelection("<u>", "</u>")}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 underline shrink-0"
                    >
                      U
                    </button>
                    <button
                      onClick={() => wrapSelection("~~", "~~")}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 line-through shrink-0"
                    >
                      S
                    </button>

                    <div className="w-px h-5 bg-gray-700 mx-1 shrink-0" />

                    <button
                      onClick={() => handleHeading(1)}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      H1
                    </button>
                    <button
                      onClick={() => handleHeading(2)}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      H2
                    </button>
                    <button
                      onClick={() => handleHeading(3)}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      H3
                    </button>
                    <button
                      onClick={() => handleHeading(4)}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      H4
                    </button>

                    <div className="w-px h-5 bg-gray-700 mx-1 shrink-0" />

                    <button
                      onClick={insertBulletList}
                      type="button"
                      title="Bulleted list"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      •
                    </button>
                    <button
                      onClick={insertNumberedList}
                      type="button"
                      title="Numbered list"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      1.
                    </button>

                    <div className="w-px h-5 bg-gray-700 mx-1 shrink-0" />

                    <button
                      onClick={() => wrapSelection("> ")}
                      type="button"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapSelection("```\n", "\n```")}
                      className="px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
                    >
                      Code
                    </button>

                    <div className="w-px h-5 bg-gray-700 mx-1 shrink-0" />

                    <button
                      type="button"
                      onClick={openInlineImagePicker}
                      title="Insert image"
                      className="px-3 py-1.5 rounded hover:bg-slate-700 flex items-center gap-1 shrink-0"
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
                </div>

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setContent(newContent);
                    setInlineImages((prev) =>
                      prev.filter((img) =>
                        newContent.includes(img.placeholder),
                      ),
                    );
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your blog content here (minimum 100 characters)..."
                  className="w-full p-4 h-72 bg-slate-900 text-gray-100 resize-vertical rounded-b-md outline-none font-mono text-sm"
                />
              </div>

              {/* ── Inline image warning ── */}
              <AnimatePresence>
                {inlineImageError && (
                  <ValidationWarning
                    key="inline-img-err"
                    message={inlineImageError}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showErrors && getContentError() && (
                  <ValidationWarning
                    key="content-err"
                    message={getContentError()!}
                  />
                )}
              </AnimatePresence>
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
    </>
  );
}
