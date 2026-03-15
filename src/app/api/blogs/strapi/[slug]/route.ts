import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL!;
const STRAPI_PUBLIC_TOKEN = process.env.STRAPI_PUBLIC_TOKEN;

function makeAbsolute(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  
  const baseUrl = STRAPI_URL.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return baseUrl + path;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const url =
      `${STRAPI_URL}/api/blogs` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&filters[publishedAt][$notNull]=true` +
      `&populate[cover][fields]=url` +
      `&populate[category][fields]=name,slug` +
      `&populate[writer][fields]=username,email` +
      `&populate[author][fields]=name,email`; 

    const res = await fetch(url, {
      headers: STRAPI_PUBLIC_TOKEN
        ? { Authorization: `Bearer ${STRAPI_PUBLIC_TOKEN}` }
        : {},
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Strapi fetch failed: ${res.statusText}`);
    }

    const json = await res.json();

    if (!Array.isArray(json.data) || json.data.length === 0) {
      return NextResponse.json(
        { error: "Blog not found in Strapi" },
        { status: 404 }
      );
    }

    const entry = json.data[0];
    const attrs = entry.attributes || entry;

    /* ───── COVER IMAGE ───── */
    const coverField =
      attrs.cover ||
      attrs.coverImage ||
      attrs.cover_image ||
      attrs.featuredImage;

    const coverData = coverField?.data || coverField;
    const coverUrl = coverData?.attributes?.url || coverData?.url;
    const coverImage = makeAbsolute(coverUrl);

    /* ───── AUTHOR / WRITER ───── */
    const writerRaw = attrs.writer || attrs.author;
    const writerData = writerRaw?.data || writerRaw;
    const writerAttrs = writerData?.attributes || writerData;
    
    const authorName =
      writerAttrs?.username || 
      writerAttrs?.name || 
      "Author";

    const authorEmail = writerAttrs?.email || null;

    /* ───── CATEGORIES ───── */
    const catRaw = attrs.category || attrs.categories;
    const catArray = catRaw?.data || catRaw || [];

    const categories = Array.isArray(catArray)
      ? catArray.map((c: any) => {
          const catAttr = c.attributes || c;
          return catAttr.name || catAttr.slug;
        })
      : [];

    return NextResponse.json({
      blog: {
        title: attrs.title,
        slug: attrs.slug,
        content: attrs.content,
        description: attrs.description,
        coverImage,
        categories,
        createdAt: attrs.createdAt || attrs.publishedAt,
        updatedAt: attrs.updatedAt,
        status: "published",
        author: {
          username: authorName, 
          email: authorEmail,
        },
      },
    });
  } catch (err) {
    console.error("❌ Strapi blog fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch published blog" },
      { status: 500 }
    );
  }
}