import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Try by _id first, then by slug
    let post = await sanityClient.fetch(
      `*[_type=="post" && _id==$id][0]{
        _id, title, "slug": slug.current, description, publishedAt,
        image{ asset, alt, hotspot, crop },
        body,
        author->{ _id, name, "slug": slug.current, email },
        categories[]->{ _id, name, "slug": slug.current, description }
      }`,
      { id }
    );

    if (!post) {
      post = await sanityClient.fetch(
        `*[_type=="post" && slug.current==$id][0]{
          _id, title, "slug": slug.current, description, publishedAt,
          image{ asset, alt, hotspot, crop },
          body,
          author->{ _id, name, "slug": slug.current, email },
          categories[]->{ _id, name, "slug": slug.current, description }
        }`,
        { id }
      );
    }

    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ post });
  } catch (e: any) {
    console.error("Sanity fetch failed:", e.message);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
