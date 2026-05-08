import Link from "next/link";
import Image from "next/image";
import { FaTwitter, FaGithub, FaInstagram } from "react-icons/fa";
import {
  Home,
  BookOpen,
  PenTool,
  Info,
  Mail,
  Feather,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Globe,
  Heart,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-[#02050a] pt-12 text-gray-300">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* COLUMN 1: Logo & Socials */}
          <div className="flex flex-col items-center text-center lg:col-span-3 lg:items-start lg:text-left">
            <Link href="/" className="inline-block">
              <Image
                src="/images/Logo.png"
                alt="Palette Publisher Logo"
                width={200}
                height={50}
                className="h-36 w-auto"
                priority
              />
            </Link>
            <p className="mt-5 text-[16px] leading-relaxed text-gray-300">
              A modern publishing platform for creators, storytellers, and
              dreamers. Your voice deserves the world.
            </p>

            <div className="mt-7 flex gap-4">
              <a
                href="https://x.com/tamajitsaha05"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 transition-all hover:bg-teal-500/20 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)]"
              >
                <FaTwitter size={20} />
              </a>
              <a
                href="https://github.com/Tamajit-005"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 transition-all hover:bg-teal-500/20 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)]"
              >
                <FaGithub size={20} />
              </a>
              <a
                href="https://www.instagram.com/tamajit005/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 transition-all hover:bg-teal-500/20 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)]"
              >
                <FaInstagram size={20} />
              </a>
            </div>
          </div>

          {/* COLUMN 2: Quick Links */}
          <div className="lg:col-span-3 lg:pl-10">
            <div className="mb-5 flex flex-col items-start gap-1.5">
              <h2 className="text-[19px] font-semibold text-white">
                Quick Links
              </h2>
              {/* Line and Dot Icon */}
              <div className="flex items-center gap-1.5">
                <span className="h-[2px] w-5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              </div>
            </div>
            <ul className="flex flex-col gap-5 mt-4">
              <li>
                <Link
                  href="/"
                  className="group flex items-center gap-4 text-[16px] text-gray-200 transition hover:text-teal-300"
                >
                  <Home
                    size={20}
                    className="text-teal-400 transition group-hover:text-teal-300"
                  />
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/blogs"
                  className="group flex items-center gap-4 text-[16px] text-gray-200 transition hover:text-teal-300"
                >
                  <BookOpen
                    size={20}
                    className="text-teal-400 transition group-hover:text-teal-300"
                  />
                  Blogs
                </Link>
              </li>
              <li>
                <Link
                  href="/create"
                  className="group flex items-center gap-4 text-[16px] text-gray-200 transition hover:text-teal-300"
                >
                  <PenTool
                    size={20}
                    className="text-teal-400 transition group-hover:text-teal-300"
                  />
                  Create
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="group flex items-center gap-4 text-[16px] text-gray-200 transition hover:text-teal-300"
                >
                  <Info
                    size={20}
                    className="text-teal-400 transition group-hover:text-teal-300"
                  />
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="group flex items-center gap-4 text-[16px] text-gray-200 transition hover:text-teal-300"
                >
                  <Mail
                    size={20}
                    className="text-teal-400 transition group-hover:text-teal-300"
                  />
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: For Writers */}
          <div className="lg:col-span-3">
            <div className="mb-5 flex flex-col items-start gap-1.5">
              <h2 className="text-[19px] font-semibold text-white">
                For Writers
              </h2>
              {/* Line and Dot Icon */}
              <div className="flex items-center gap-1.5">
                <span className="h-[2px] w-5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              </div>
            </div>
            <ul className="flex flex-col gap-6 mt-4">
              <li className="flex items-start gap-4">
                <div>
                  <Link
                    href="/create"
                    className="group flex items-center gap-4 text-[16px] font-medium text-gray-200 transition hover:text-teal-300"
                  >
                    <Feather size={20} className="shrink-0 text-teal-400" />
                    <span>Write & Publish</span>
                  </Link>

                  <p className="mt-1 pl-9 text-[14px] text-gray-400">
                    Share your ideas with the world
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div>
                  <Link
                    href="/blogs"
                    className="group flex items-center gap-4 text-[16px] font-medium text-gray-200 transition hover:text-teal-300"
                  >
                    <LayoutDashboard
                      size={20}
                      className="mt-0.5 text-teal-400 shrink-0"
                    />
                    Dashboard & Manage
                  </Link>
                  <p className="mt-1 pl-9 text-[14px] text-gray-400">
                    Manage posts and track approvals
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                {/* <ShieldCheck
                  size={20}
                  className="mt-0.5 text-teal-400 shrink-0"
                /> */}
                {/* <div>
                  <Link
                    href="/guidelines"
                    className="group flex items-center gap-4 text-[16px] font-medium text-gray-200 transition hover:text-teal-300"
                  >
                    <ShieldCheck
                      size={20}
                      className="mt-0.5 text-teal-400 shrink-0"
                    />
                    Guidelines
                  </Link>
                  <p className="mt-1 pl-9 text-[14px] text-gray-400">
                    Read our content & publishing policy
                  </p>
                </div> */}
              </li>
            </ul>
          </div>

          {/* COLUMN 4: Quote Card */}
          <div className="hidden md:block lg:col-span-3">
            <div className="relative mt-2 h-full rounded-[20px] border border-white/5 bg-[rgba(255,255,255,0.02)] p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md">
              <span className="absolute -left-2 -top-2 text-6xl text-teal-400">
                "
              </span>
              <p className="relative z-10 text-[17px] italic leading-relaxed text-gray-300">
                Words have power. Stories have impact. You have something worth
                sharing.
              </p>
              <p className="mt-5 text-[14px] font-semibold text-teal-400">
                — Keep Publishing
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM FEATURE PILL */}
        <div className="mt-12 hidden md:flex flex-col items-start gap-6 rounded-[2rem] border border-white/[0.06] bg-white/[0.01] p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:px-10 lg:py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/10">
              <ShieldCheck size={22} className="text-teal-400" />
            </div>
            <div>
              <h4 className="text-[16px] font-medium text-teal-400">
                Secure & Reliable
              </h4>
              <p className="mt-0.5 text-[14px] text-gray-400">
                Your data and content
                <br />
                are always protected.
              </p>
            </div>
          </div>

          <div className="hidden h-10 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/10">
              <Zap size={22} className="text-teal-400" />
            </div>
            <div>
              <h4 className="text-[16px] font-medium text-teal-400">
                Fast & Modern
              </h4>
              <p className="mt-0.5 text-[14px] text-gray-400">
                Built with modern tech
                <br />
                for a smooth experience.
              </p>
            </div>
          </div>

          <div className="hidden h-10 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/10">
              <Globe size={22} className="text-teal-400" />
            </div>
            <div>
              <h4 className="text-[16px] font-medium text-teal-400">
                Global Community
              </h4>
              <p className="mt-0.5 text-[14px] text-gray-400">
                Writers and readers from
                <br />
                around the world.
              </p>
            </div>
          </div>

          <div className="hidden h-10 w-px bg-white/10 lg:block" />

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/10">
              <Heart size={22} className="text-teal-400" />
            </div>
            <div>
              <h4 className="text-[16px] font-medium text-teal-400">
                Made with Passion
              </h4>
              <p className="mt-0.5 text-[14px] text-gray-400">
                Designed for creators
                <br />
                who love to create.
              </p>
            </div>
          </div>
        </div>

        {/* COPYRIGHT BAR */}
        <div className="mt-8 border-t border-white/[0.04] pb-8 pt-6 text-center text-[14px] text-gray-500 sm:text-[15px]">
          © {new Date().getFullYear()}{" "}
          <span className="font-medium text-teal-400">Palette Publisher</span>.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
}
