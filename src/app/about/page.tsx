"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  PencilLine,
  ShieldCheck,
  PanelsTopLeft,
  Users,
  Feather,
  BookOpen,
  PenTool,
  Globe,
} from "lucide-react";

const leftItems = [
  {
    icon: PencilLine,
    title: "Write Freely",
    text: "A clean, minimal editor that helps you focus on your words without any distractions.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted & Secure",
    text: "Every blog goes through a careful review process to ensure quality and authenticity.",
  },
  {
    icon: PanelsTopLeft,
    title: "Your Space",
    text: "Manage your posts, track approvals, and iterate on your ideas anytime, anywhere.",
  },
  {
    icon: Users,
    title: "Made For Everyone",
    text: "Whether you are a beginner or a pro, we got you covered.",
  },
];

const bottomCards = [
  {
    icon: Feather,
    title: "Craft Meaningful\\nStories",
    text: "Share ideas that inspire, inform, and leave a mark.",
  },
  {
    icon: BookOpen,
    title: "Built for\\nReaders",
    text: "Beautiful reading experience across all devices.",
  },
  {
    icon: PenTool,
    title: "Design That\\nDisappears",
    text: "A distraction-free interface so your content shines.",
  },
  {
    icon: Globe,
    title: "A Global\\nCommunity",
    text: "Connect with readers and writers from around the world.",
  },
];

export default function AboutPage() {
  return (
    <main className="relative w-full overflow-x-hidden bg-[#02050a] text-white xl:min-h-screen">
      {/* BACKGROUND IMAGE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image
          src="/images/hero-bg.webp"
          alt="Palette Publisher background"
          fill
          priority
          className="h-full w-full object-cover object-[60%_top] sm:object-top"
        />

        {/* DARKENING LAYERS */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,0.96)_0%,rgba(3,5,10,0.94)_28%,rgba(3,5,10,0.82)_45%,rgba(3,5,10,0.40)_65%,rgba(3,5,10,0.45)_80%,rgba(3,5,10,0.75)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(45,212,191,0.06),transparent_20%)]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-[#02050a] via-[#02050a]/80 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#02050a] via-[#02050a]/90 to-transparent" />
      </div>

      {/* PAGE CANVAS */}
      <section className="relative z-10 w-full xl:h-full">
        {/* Increased mobile padding (pt-44) to clear the two-row navbar */}
        <div className="mx-auto flex max-w-[1600px] flex-col px-6 pb-6 pt-44 md:px-10 lg:px-12 xl:h-full xl:justify-center xl:pt-[100px]">
          <div className="grid grid-cols-1 gap-8 xl:min-h-[calc(100vh-106px)] xl:flex-1 xl:grid-cols-[0.9fr_1.1fr]">
            {/* LEFT PANEL */}
            <div className="flex max-w-[580px] flex-col justify-start xl:h-full xl:pt-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col max-w-[580px] xl:h-full xl:justify-center"
              >
                {/* eyebrow pill */}
                <div className="mb-4 inline-flex w-fit items-center gap-2.5 rounded-full border border-teal-400/15 bg-[rgba(6,14,18,0.4)] px-4 py-2 text-[12px] font-medium text-teal-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl">
                  <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,1)]" />
                  <span>Your Voice. Your Story. Your World.</span>
                </div>

                {/* main heading */}
                <div>
                  <h1 className="text-[44px] font-bold leading-[0.9] tracking-tight text-white sm:text-[52px] xl:text-[62px]">
                    About
                  </h1>
                  <h1 className="mt-1 text-[40px] font-bold leading-[0.9] tracking-tight text-teal-400 drop-shadow-[0_0_14px_rgba(45,212,191,0.15)] sm:text-[48px] xl:text-[58px]">
                    Palette Publisher
                  </h1>
                </div>

                {/* intro text */}
                <p className="mt-5 max-w-[540px] text-[15px] leading-[1.5] text-gray-300 xl:text-[19px]">
                  <span className="font-medium text-teal-300">
                    Palette Publisher
                  </span>{" "}
                  is a modern blogging platform where writers can craft, submit,
                  and share their ideas with the world — with a clean,
                  distraction-free experience.
                </p>

                {/* line divider */}
                <div className="relative mb-5 mt-6 h-px w-full max-w-[500px] bg-white/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
                  <div className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.9)]" />
                </div>

                {/* features */}
                <div className="max-w-[540px] space-y-1">
                  {leftItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.1 + i * 0.06,
                          duration: 0.4,
                        }}
                        className="grid grid-cols-[56px_1fr] items-start border-b border-white/5 pb-2.5 pt-1.5 last:border-0"
                      >
                        <div className="flex justify-start">
                          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-teal-400/10 bg-[rgba(8,14,18,0.35)] shadow-[inset_0_0_12px_rgba(45,212,191,0.03)] backdrop-blur-md">
                            <Icon
                              size={18}
                              strokeWidth={1.8}
                              className="text-teal-300"
                            />
                          </div>
                        </div>

                        <div className="pt-0.5">
                          <h2 className="text-[17px] font-semibold leading-[1.2] text-teal-300 sm:text-[18px]">
                            {item.title}
                          </h2>
                          <p className="mt-1 max-w-[440px] text-[15px] leading-[1.4] text-gray-300 sm:text-[16px]">
                            {item.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* RIGHT PANEL (Hidden on mobile) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative hidden h-full flex-col justify-end pb-[6vh] xl:flex"
            >
              <div className="absolute left-[50%] top-[36%] z-20 -translate-x-1/2 -translate-y-1/2">
                <Image
                  src="/images/Logo.webp"
                  alt="Palette Publisher logo"
                  width={340}
                  height={340}
                  priority
                  className="h-auto w-[240px] object-contain drop-shadow-[0_0_28px_rgba(45,212,191,0.35)] 2xl:w-[280px]"
                />
              </div>

              <div className="relative z-30 grid w-full grid-cols-4 gap-3 pl-4 pr-2 -translate-y-6">
                {bottomCards.map((card, i) => {
                  const Icon = card.icon;
                  const [line1, line2] = card.title.split("\\n");
                  return (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.05, duration: 0.4 }}
                      className="group relative overflow-hidden rounded-[20px]"
                    >
                      <div className="absolute inset-0 rounded-[20px] border border-teal-300/15 bg-[rgba(10,14,18,0.01)] shadow-[0_8px_20px_rgba(0,0,0,0.22),0_0_18px_rgba(45,212,191,0.22),inset_0_0_18px_rgba(45,212,191,0.08)] backdrop-blur-xl" />
                      <div className="absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_50%)]" />
                      <div className="absolute inset-0 rounded-[20px] shadow-[0_0_24px_rgba(45,212,191,0.10)]" />

                      <div className="relative flex h-[200px] flex-col items-center px-4 py-5 text-center">
                        <Icon
                          size={28}
                          strokeWidth={1.8}
                          className="text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.2)]"
                        />
                        <h3 className="mt-4 text-[18px] font-medium leading-[1.2] text-white">
                          {line1}
                          <br />
                          {line2}
                        </h3>
                        <p className="mt-2.5 text-[16px] leading-[1.4] text-gray-300">
                          {card.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
