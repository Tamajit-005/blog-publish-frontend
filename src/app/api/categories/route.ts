import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;

    const response = await fetch(`${strapiUrl}/api/categories?sort=name:asc`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch categories from Strapi");
    }

    const data = await response.json();
    
    // Handle both Strapi v4 (with attributes) and v5 (without attributes)
    const categories = data.data.map((cat: any) => ({
      id: cat.id,
      name: cat.attributes?.name || cat.name,
      slug: cat.attributes?.slug || cat.slug,
    }));

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
