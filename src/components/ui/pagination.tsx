"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

// Utility: safely concatenate Tailwind class names
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
      className={cn("mx-auto flex w-full justify-center mt-8", className)}
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
      className={cn("flex flex-row items-center gap-1", className)}
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
        "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200",
        isActive
          ? "bg-teal-500 text-gray-900 border border-teal-400 shadow-sm"
          : "text-gray-400 hover:text-teal-400 hover:bg-gray-800",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function PaginationPrevious({
  href,
  className,
  ...props
}: {
  href: string;
} & React.ComponentProps<"a">) {
  return (
    <PaginationLink
      href={href}
      className={cn(
        "flex items-center gap-1 px-3 text-teal-400 hover:bg-teal-900/30",
        className
      )}
      {...props}
    >
      <ChevronLeftIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Previous</span>
    </PaginationLink>
  );
}

export function PaginationNext({
  href,
  className,
  ...props
}: {
  href: string;
} & React.ComponentProps<"a">) {
  return (
    <PaginationLink
      href={href}
      className={cn(
        "flex items-center gap-1 px-3 text-teal-400 hover:bg-teal-900/30",
        className
      )}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRightIcon className="w-4 h-4" />
    </PaginationLink>
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
        "flex w-9 h-9 items-center justify-center text-gray-400",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon className="w-4 h-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
