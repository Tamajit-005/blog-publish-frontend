"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import CinematicLoader from "@/components/CinematicLoader";
import SecondaryLoader from "@/components/SecondaryLoader"; // Import new loader

export default function GlobalSiteLoader() {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [shouldShowIntro, setShouldShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("home-loader-shown") === "true";
    setShouldShowIntro(!alreadyShown);
    setChecked(true);
  }, []);

  useEffect(() => {
    setPageReady(false);

    const img = new window.Image();
    img.src = "/images/hero-bg.webp";

    if (img.complete) {
      setPageReady(true);
    } else {
      img.onload = () => setPageReady(true);
      img.onerror = () => setPageReady(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!checked) return;

    if (!shouldShowIntro) {
      setIntroDone(true);
      return;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem("home-loader-shown", "true");
      setIntroDone(true);
    }, 3200);

    return () => clearTimeout(timer);
  }, [checked, shouldShowIntro]);

  const showLoader = useMemo(() => {
    if (!checked) return true;
    if (shouldShowIntro) return !introDone || !pageReady;
    return !pageReady;
  }, [checked, shouldShowIntro, introDone, pageReady]);

  // Handle Return
  if (pathname === "/") return null; // Home page handles its own CinematicLoader

  return <AnimatePresence>{showLoader && <SecondaryLoader />}</AnimatePresence>;
}
