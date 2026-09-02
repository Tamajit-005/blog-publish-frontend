"use client";

import { urlFor } from "@/sanity/image";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

function CodeBlock({ value }: any) {
  const [copied, setCopied] = useState(false);
  const raw: unknown = value?.code;
  const text = typeof raw === "string" ? raw : raw != null ? String(raw) : "";
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="relative group my-6">
      <pre
        className="bg-[#04070c] border border-white/5 rounded-2xl p-5 sm:p-6 overflow-x-auto cursor-pointer hover:border-white/10 transition-colors text-[0.9rem]"
        onClick={doCopy}
        title="Tap to copy"
      >
        <code className="text-teal-300 text-sm block whitespace-pre font-mono">{text}</code>
      </pre>
      <button
        onClick={doCopy}
        aria-label="Copy code"
        className="absolute top-3 right-3 p-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
      >
        {copied ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

export const portableComponents: any = {
  block: {
    h1: ({ children }: any) => (
      <h1 className="text-4xl sm:text-5xl font-black text-teal-400 mt-10 mb-6 border-b border-teal-500/20 pb-4 tracking-tight drop-shadow-[0_0_15px_rgba(45,212,191,0.3)]">{children}</h1>
    ),
    h2: ({ children }: any) => <h2 className="text-3xl sm:text-4xl font-extrabold text-teal-400 mt-8 mb-5 tracking-tight">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl sm:text-3xl font-bold text-teal-400 mt-6 mb-4">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-xl sm:text-2xl font-semibold text-teal-400 mt-6 mb-3">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-lg sm:text-xl font-semibold text-teal-400 mt-4 mb-2">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-base sm:text-lg font-semibold text-teal-400 mt-4 mb-2">{children}</h6>,
    normal: ({ children }: any) => <p className="text-gray-300 leading-relaxed my-3 text-lg">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-teal-500 pl-4 ml-2 italic text-gray-400 my-4">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc list-inside my-4 pl-2 text-gray-300 space-y-1">{children}</ul>,
    number: ({ children }: any) => <ol className="list-decimal list-inside my-4 pl-2 text-gray-300 space-y-1">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: any) => <li className="ml-2">{children}</li>,
    number: ({ children }: any) => <li className="ml-2">{children}</li>,
  },
  marks: {
    code: ({ children }: any) => <code className="bg-white/5 text-teal-300 px-1.5 py-0.5 rounded text-sm font-mono border border-white/5">{children}</code>,
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }: any) => <em className="italic text-white">{children}</em>,
    underline: ({ children }: any) => <u className="underline decoration-teal-300 underline-offset-4">{children}</u>,
    "strike-through": ({ children }: any) => <span className="line-through decoration-teal-300">{children}</span>,
    strike: ({ children }: any) => <span className="line-through decoration-teal-300">{children}</span>,
    link: ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-teal-300 underline decoration-teal-600 underline-offset-4 decoration-2 hover:text-teal-200 hover:decoration-teal-400 transition-colors">
        {children}↗
      </a>
    ),
  },
  types: {
    image: ({ value }: any) => {
      if (!value?.asset) return null;
      // Handle base64 preview (pending) where asset is data URI via _ref
      if (typeof value.asset._ref === "string" && value.asset._ref.startsWith("data:")) {
        return <img src={value.asset._ref} alt={value.alt || ""} className="rounded-2xl border border-white/5 my-10 w-full shadow-2xl object-cover max-h-[600px]" loading="lazy" />;
      }
      try {
        return <img src={urlFor(value).width(800).url()} alt={value.alt || ""} title={value.alt || undefined} className="rounded-2xl border border-white/5 w-full my-10 shadow-2xl object-cover max-h-[600px]" loading="lazy" />;
      } catch {
        return null;
      }
    },
    code: CodeBlock,
  },
};
