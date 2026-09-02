import { NextResponse } from "next/server";
import { SANITY_CATEGORIES } from "@/lib/categories";

export async function GET() {
  try {
    return NextResponse.json({ categories: SANITY_CATEGORIES.map((c) => ({ name: c.name, slug: c.slug })) });
  } catch (error: any) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
