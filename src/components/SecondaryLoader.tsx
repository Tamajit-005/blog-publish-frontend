"use client";
import { motion } from "framer-motion";
import PyramidLoader from "./PyramidLoader";

export default function SecondaryLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#04070c]"
    >
      <PyramidLoader />
    </motion.div>
  );
}
