"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function CinematicLoader() {
  const [zoomPhase, setZoomPhase] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setZoomPhase(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden pointer-events-none">
      {/* DARK OVERLAY */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: zoomPhase ? 0 : 0.78 }}
        transition={{
          duration: 1.2,
          delay: zoomPhase ? 0.25 : 0,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-0 bg-black"
        style={{ willChange: "opacity" }}
      />

      {/* VIGNETTE */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: zoomPhase ? 0 : 1 }}
        transition={{
          duration: 1.1,
          delay: zoomPhase ? 0.2 : 0,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,black_88%)]"
        style={{ willChange: "opacity" }}
      />

      {/* GRID */}
      <motion.div
        initial={{ opacity: 0.03 }}
        animate={{ opacity: zoomPhase ? 0 : 0.03 }}
        transition={{
          duration: 1,
          delay: zoomPhase ? 0.2 : 0,
        }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:32px_32px]"
        style={{ willChange: "opacity" }}
      />

      {/* LOGO */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{
            scale: 0.22,
            opacity: 0,
          }}
          animate={{
            scale: zoomPhase ? 12 : 1,
            opacity: zoomPhase ? 0 : 1,
          }}
          transition={{
            duration: 2.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative"
          style={{ willChange: "transform, opacity" }}
        >
          {/* GLOW */}
          <motion.div
            animate={
              zoomPhase
                ? { opacity: 0, scale: 1.02 }
                : { opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }
            }
            transition={
              zoomPhase
                ? { duration: 0.35, ease: "easeOut" }
                : { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
            className="absolute inset-0 rounded-full bg-teal-400/25 blur-xl"
            style={{ willChange: "transform, opacity" }}
          />

          <img
            src="/images/Logo.png"
            alt="Logo"
            className="relative z-10 w-[180px] object-contain md:w-[240px]"
            style={{ willChange: "transform, opacity" }}
          />
        </motion.div>
      </div>

      {/* AMBIENT ORB */}
      <motion.div
        animate={
          zoomPhase
            ? { opacity: 0, scale: 1.02 }
            : { opacity: [0.08, 0.16, 0.08], scale: [1, 1.06, 1] }
        }
        transition={
          zoomPhase
            ? { duration: 0.4, ease: "easeOut" }
            : { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }
        className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/15 blur-2xl"
        style={{ willChange: "transform, opacity" }}
      />
    </div>
  );
}
