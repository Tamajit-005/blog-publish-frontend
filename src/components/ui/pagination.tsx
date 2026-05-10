"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Pagination({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center mt-12", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-2", className)}
      {...props}
    />
  );
}

export function PaginationItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return <li className={cn("list-none", className)} {...props} />;
}

type PaginationLinkProps = {
  href: string;
  isActive?: boolean;
  children: React.ReactNode;
};

export function PaginationLink({
  href,
  isActive,
  children,
  className,
  ...props
}: PaginationLinkProps & React.ComponentProps<"a">) {
  return (
    <Link
      href={href}
      className={cn(
        // Base Liquid Glass Styles
        "relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-md border",
        isActive
          ? "bg-teal-500/20 text-teal-300 border-teal-400/40 shadow-[0_0_20px_rgba(45,212,191,0.2),inset_0_0_10px_rgba(45,212,191,0.1)]"
          : "bg-white/[0.03] text-white/50 border-white/10 hover:border-teal-400/30 hover:text-teal-300 hover:bg-teal-400/5",
        className,
      )}
      {...props}
    >
      {/* Subtle Inner Glow for active state */}
      {isActive && (
        <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_8px_rgba(255,255,255,0.1)] pointer-events-none" />
      )}
      {children}
    </Link>
  );
}

export function PaginationPrevious({
  href,
  className,
  disabled,
  ...props
}: {
  href: string;
  disabled?: boolean;
} & React.ComponentProps<"a">) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 backdrop-blur-md bg-white/[0.03]",
        disabled
          ? "opacity-20 pointer-events-none border-white/5 text-white/20"
          : "border-white/10 text-white/50 hover:border-teal-400/30 hover:text-teal-300 hover:bg-teal-400/5",
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon className="w-4 h-4" />
      <span className="sr-only">Previous</span>
    </Link>
  );
}

export function PaginationNext({
  href,
  className,
  disabled,
  ...props
}: {
  href: string;
  disabled?: boolean;
} & React.ComponentProps<"a">) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 backdrop-blur-md bg-white/[0.03]",
        disabled
          ? "opacity-20 pointer-events-none border-white/5 text-white/20"
          : "border-white/10 text-white/50 hover:border-teal-400/30 hover:text-teal-300 hover:bg-teal-400/5",
        className,
      )}
      {...props}
    >
      <ChevronRightIcon className="w-4 h-4" />
      <span className="sr-only">Next</span>
    </Link>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex w-10 h-10 items-center justify-center text-white/30",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon className="w-4 h-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
