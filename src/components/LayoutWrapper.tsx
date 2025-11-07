"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define pages where the footer should be hidden
  const hideFooterPaths = ["/"];

  const shouldHideFooter = hideFooterPaths.includes(pathname);

  return (
    <>
      {children}
      {!shouldHideFooter && <Footer />}
    </>
  );
}
