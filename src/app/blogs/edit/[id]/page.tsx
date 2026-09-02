"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FIXED_CATEGORIES } from "@/lib/categories";

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
      className="mt-2 flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200"
    >
      <span className="mt-0.5 shrink-0 text-sm leading-none">⚠️</span>
      <span>{message}</span>
    </motion.div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const nearLimit = current >= max - 20;
  const atLimit = current >= max;

  return (
    <p
      className={`mt-1 text-right text-xs transition-colors ${
        atLimit
          ? "text-red-400"
          : nearLimit
            ? "text-yellow-400"
            : "text-gray-500"
      }`}
    >
      {current}/{max}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0f1623] shadow-2xl"
      >
        <div className="border-b border-white/10 px-5 pb-3 pt-5">
          <p className="text-sm font-semibold text-gray-200">
            {typeof window !== "undefined"
              ? window.location.host
              : "palettepublisher.com"}{" "}
            says
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-400">{message}</p>
        </div>
        <div className="flex justify-end px-5 pb-5">
          <button
            onClick={onOk}
            className="rounded-full bg-teal-500 px-6 py-1.5 text-sm font-semibold text-gray-900 transition hover:bg-teal-400"
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white/10 hover:text-gray-100"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-white/10" />;
}

interface Category {
  name: string;
  slug: string;
}

interface InlineImage {
  id: string;
  base64: string;
  placeholder: string;
  sanityAssetId?: string;
  sanityUrl?: string;
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

  const [categories] = useState<Category[]>(FIXED_CATEGORIES);
  const loadingCategories = false;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
  const slugRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/username")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then(setUser)
      .catch(() => router.push("/login"));

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

  useEffect(() => {
    setInlineImages((prev) => {
      const next = prev.filter((img) => content.includes(img.placeholder));
      return next.length === prev.length ? prev : next;
    });
  }, [content]);

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

    const maxSize = 400 * 1024;
    if (file.size > maxSize) {
      setCoverImageError("Image size must be less than 400KB.");
      return;
    }

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

    const maxSize = 400 * 1024;
    if (file.size > maxSize) {
      setInlineImageError("Image size must be less than 400KB.");
      return;
    }

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
        placeholder,
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

  function getSlugError(): string | null {
    if (slug.trim().length === 0) return "Please fill in this field.";
    if (!/^[a-z0-9-]+$/.test(slug.trim()))
      return "Slug must be lowercase, URL-friendly, and contain no spaces.";
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
          : getSlugError()
            ? slugRef
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
      getSlugError() ||
      getContentError()
    ) {
      return;
    }

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

  function handleLink() {
    const el = textareaRef.current;
    if (!el) return;
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || "text";
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const wrapped = `[${selected}](${url})`;
    const newVal = before + wrapped + after;
    el.value = newVal;
    setContent(newVal);
    el.selectionStart = start;
    el.selectionEnd = start + wrapped.length;
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

  function toggleCategory(slug: string) {
    if (selectedCategories.includes(slug)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== slug));
    } else if (selectedCategories.length < 3) {
      setSelectedCategories([...selectedCategories, slug]);
    }
  }

  function renderCoverImageSection(inputId: string, className = "") {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}
      >
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Cover Image
        </label>

        {!imagePreview ? (
          <>
            <label
              htmlFor={inputId}
              className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 p-6 text-center transition hover:border-teal-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition group-hover:bg-teal-500/10">
                <svg
                  className="h-5 w-5 text-gray-500 transition group-hover:text-teal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-400">
                <span className="font-medium text-teal-400">
                  Upload Cover Image
                </span>
                <br />
                <span className="text-gray-500">Click to browse</span>
              </span>
              <span className="text-xs text-gray-600">
                Recommended: 1200 × 630px <br /> (Max 400 KB)
              </span>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id={inputId}
            />
          </>
        ) : (
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={imagePreview}
              alt="Cover preview"
              className="aspect-video w-full object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white transition hover:bg-red-600"
              title="Remove image"
            >
              <svg
                className="h-3.5 w-3.5"
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

        <AnimatePresence>
          {coverImageError && (
            <ValidationWarning
              key={`${inputId}-cover-img-err`}
              message={coverImageError}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  function renderInlineImageSection(inputId: string, className = "") {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}
      >
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Inline Images
        </label>

        <label
          htmlFor={inputId}
          className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 p-5 text-center transition hover:border-teal-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition group-hover:bg-teal-500/10">
            <svg
              className="h-5 w-5 text-gray-500 transition group-hover:text-teal-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <span className="text-xs text-gray-400">
            <span className="font-medium text-teal-400">
              Upload Inline Images
            </span>
            <br />
            <span className="text-gray-500">Insert images into content</span>
          </span>
          <span className="text-xs text-gray-600">Max 400 KB each</span>
        </label>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={handleInlineImageUpload}
          className="hidden"
        />

        {inlineImages.length > 0 && (
          <button
            type="button"
            onClick={openInlineImagePicker}
            className="mt-3 w-full rounded-lg border border-teal-500/30 py-2 text-xs font-medium text-teal-400 transition hover:bg-teal-500/10"
          >
            Select More Images
          </button>
        )}

        <AnimatePresence>
          {inlineImageError && (
            <ValidationWarning
              key={`${inputId}-inline-img-err`}
              message={inlineImageError}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (loading) return null;

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

      <main className="relative isolate min-h-screen text-gray-100">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[#02050a]" />
        <div className="pointer-events-none fixed inset-0 z-0 bg-cover bg-top bg-no-repeat opacity-30" />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative z-10 px-4 pb-28 pt-36 sm:px-6 sm:pb-12 sm:pt-40 lg:pt-32"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/15">
                <svg
                  className="h-5 w-5 text-teal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                  Edit Blog
                </h1>
                <p className="mt-0.5 text-sm text-gray-400">
                  Update your ideas, stories, and knowledge with the world.
                </p>
              </div>
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-500/25 bg-blue-500/8 px-4 py-3 text-sm text-blue-300">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                If this blog is already published, your edits will be submitted
                for admin review before replacing the live version.
              </span>
            </div>

            {message && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                {message}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5 lg:flex-row"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div
                  ref={titleRef}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Blog Title{" "}
                    <span className="normal-case font-normal tracking-normal text-red-400">
                      *
                    </span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter an engaging title for your blog..."
                    maxLength={200}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-teal-500/60 focus:bg-white/[0.07]"
                  />
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

                <div
                  ref={slugRef}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Slug{" "}
                    <span className="normal-case font-normal tracking-normal text-red-400">
                      *
                    </span>
                  </label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="your-blog-slug"
                    required
                    pattern="[a-z0-9-]+"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-teal-500/60 focus:bg-white/[0.07]"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    This will be your blog&apos;s unique URL slug
                  </p>
                  <AnimatePresence>
                    {showErrors && getSlugError() && (
                      <ValidationWarning
                        key="slug-err"
                        message={getSlugError()!}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div
                  ref={descriptionRef}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Description{" "}
                    <span className="normal-case font-normal tracking-normal text-red-400">
                      *
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a short description about your blog..."
                    maxLength={300}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-teal-500/60 focus:bg-white/[0.07]"
                  />
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

                <div
                  ref={categoryRef}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Categories{" "}
                      <span className="normal-case font-normal tracking-normal text-red-400">
                        *
                      </span>
                    </label>
                    <span className="text-xs text-gray-500">
                      {selectedCategories.length === 3
                        ? "Max 3 selected"
                        : `${selectedCategories.length}/3 selected`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 lg:flex lg:flex-wrap">
                    {categories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.slug);
                      const isDisabled =
                        !isSelected && selectedCategories.length >= 3;

                      return (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => toggleCategory(cat.slug)}
                          disabled={isDisabled}
                          className={`rounded-xl border px-4 py-3 text-xs font-medium transition lg:rounded-full lg:py-2 ${
                            isSelected
                              ? "border-teal-500/60 bg-teal-500/20 text-teal-300"
                              : isDisabled
                                ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600"
                                : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/20 hover:text-gray-100"
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {showErrors && getCategoryError() && (
                      <ValidationWarning
                        key="cat-err"
                        message={getCategoryError()!}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div className="lg:hidden">
                  {renderCoverImageSection("cover-image-upload-mobile")}
                </div>

                <div className="lg:hidden">
                  {renderInlineImageSection("inline-image-trigger-mobile")}
                </div>

                <div
                  ref={contentRef}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Content{" "}
                    <span className="normal-case font-normal tracking-normal text-red-400">
                      *
                    </span>
                  </label>

                  {inlineImages.filter((img) =>
                    content.includes(img.placeholder),
                  ).length > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-teal-500/20 bg-teal-500/8 px-3 py-2 text-xs text-teal-300/90">
                      <svg
                        className="h-3.5 w-3.5 shrink-0"
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
                      <span>
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
                      </span>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <div className="overflow-x-auto border-b border-white/8 bg-white/[0.03] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex min-w-max items-center gap-0.5 px-2 py-1.5">
                        <ToolbarButton
                          onClick={() => wrapSelection("**", "**")}
                          title="Bold"
                        >
                          <span className="text-xs font-bold">B</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => wrapSelection("_", "_")}
                          title="Italic"
                        >
                          <span className="text-xs italic">I</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => wrapSelection("<u>", "</u>")}
                          title="Underline"
                        >
                          <span className="text-xs underline">U</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => wrapSelection("~~", "~~")}
                          title="Strikethrough"
                        >
                          <span className="text-xs line-through">S</span>
                        </ToolbarButton>
                        <ToolbarButton onClick={handleLink} title="Insert link">
                          <span className="text-xs">🔗</span>
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton
                          onClick={() => handleHeading(1)}
                          title="Heading 1"
                        >
                          <span className="text-xs font-bold">H1</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => handleHeading(2)}
                          title="Heading 2"
                        >
                          <span className="text-xs font-bold">H2</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => handleHeading(3)}
                          title="Heading 3"
                        >
                          <span className="text-xs font-bold">H3</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => handleHeading(4)}
                          title="Heading 4"
                        >
                          <span className="text-xs font-bold">H4</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => handleHeading(5)}
                          title="Heading 5"
                        >
                          <span className="text-xs font-bold">H5</span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => handleHeading(6)}
                          title="Heading 6"
                        >
                          <span className="text-xs font-bold">H6</span>
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton
                          onClick={insertBulletList}
                          title="Bullet list"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
                            />
                          </svg>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={insertNumberedList}
                          title="Numbered list"
                        >
                          <span className="text-[11px] font-semibold">1.</span>
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton
                          onClick={() => wrapSelection("> ")}
                          title="Blockquote"
                        >
                          <span className="text-sm font-semibold leading-none">
                            “”
                          </span>
                        </ToolbarButton>
                        <ToolbarButton
                          onClick={() => wrapSelection("```\n", "\n```")}
                          title="Code block"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton
                          onClick={openInlineImagePicker}
                          title="Insert inline image"
                        >
                          <svg
                            className="h-3.5 w-3.5"
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
                        </ToolbarButton>

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
                      className="h-72 w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-gray-200 outline-none placeholder:text-gray-600"
                    />

                    <div className="flex justify-end gap-4 border-t border-white/8 bg-white/[0.02] px-4 py-2">
                      <span className="text-xs text-gray-600">
                        Words:{" "}
                        {content.trim()
                          ? content.trim().split(/\s+/).length
                          : 0}
                      </span>
                      <span className="text-xs text-gray-600">
                        Characters: {content.length}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-600">
                    You can use Markdown formatting
                  </p>

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

                <button
                  type="submit"
                  disabled={submitting}
                  className="hidden w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-teal-400 active:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>

              <div className="hidden w-full flex-col gap-4 lg:sticky lg:top-28 lg:flex lg:w-72 xl:w-80">
                {renderCoverImageSection("cover-image-upload-desktop")}
                {renderInlineImageSection("inline-image-trigger-desktop")}
              </div>
            </form>
          </div>
        </motion.div>

        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#02050a] via-[#02050a]/95 to-transparent p-4 pt-8 lg:hidden">
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-4 text-sm font-semibold text-gray-900 transition hover:bg-teal-400 active:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </main>
    </>
  );
}
