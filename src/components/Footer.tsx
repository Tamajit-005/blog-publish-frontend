import Link from "next/link";
import { FaTwitter, FaGithub, FaInstagram } from "react-icons/fa";
import Image from "next/image";

export default function Footer() {
  // Static category list (replace later with GraphQL fetch)
  const categories = [
    { label: "Gaming", id: "zxhivhcsvvo4bwsv8lrijpop" },
    { label: "Tech", id: "icchgazsjbhc07ogtzksx6dq" },
    { label: "Food", id: "o5d6wlqkmmea2nkp17ziea7z" },
    { label: "Nature", id: "kaigx15rehooagdlsb2q9x9k" },
    { label: "Culture", id: "h1oaqs7skpgwx42u765xqrc2" },
    { label: "Entertainment", id: "ynv7oa1i6v09tx54w7pfyrze" },
  ];

  return (
    <footer className="bg-[#0f111a] text-gray-300 py-10 border-t border-gray-800 mt-10">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Logo and tagline */}
        <div>
          <Link href="/" className="inline-block">
            <Image
              src="/images/Logo.png"
              alt="Post Palette Logo"
              width={200}
              height={50}
              className="h-12 w-auto md:h-13"
              priority
            />
          </Link>
          <p className="mt-3 text-sm text-gray-400 leading-relaxed">
            A place where creators can publish, edit, and explore blogs — built
            with Strapi, Next.js & GraphQL.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="font-semibold text-white mb-3">Quick Links</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/" className="hover:text-teal-400 transition">
                Blogs
              </Link>
            </li>
            <li>
              <Link href="/create" className="hover:text-teal-400 transition">
                Publish
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-teal-400 transition">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-teal-400 transition">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h2 className="font-semibold text-white mb-3">Categories</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${encodeURIComponent(c.id)}`}
                  className="hover:text-teal-400 transition"
                  prefetch={false}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social */}
        <div>
          <h2 className="font-semibold text-white mb-3">Follow Us</h2>
          <div className="flex gap-4">
            <a
              href="https://x.com/tamajitsaha05"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaTwitter size={20} />
            </a>
            <a
              href="https://github.com/Tamajit-005"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaGithub size={20} />
            </a>
            <a
              href="https://www.instagram.com/tamajit005/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaInstagram size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-10 text-center text-gray-500 text-xs sm:text-sm border-t border-gray-800 pt-6">
        © {new Date().getFullYear()}{" "}
        <span className="text-teal-400 font-medium">Palette Publisher</span>.
        All rights reserved.
      </div>
    </footer>
  );
}
