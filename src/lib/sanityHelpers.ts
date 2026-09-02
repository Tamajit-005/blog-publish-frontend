import { sanityClient } from "./sanity";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96) || "author";
}

export async function findOrCreateAuthor(author: { auth0Id: string; username: string; email: string }) {
  const existing = await sanityClient.fetch(
    `*[_type=="author" && auth0Id==$auth0Id][0]{ _id, name, email, "slug": slug.current, auth0Id }`,
    { auth0Id: author.auth0Id }
  );
  if (existing) {
    if (existing.email !== author.email || existing.name !== author.username) {
      await sanityClient.patch(existing._id).set({ email: author.email, name: author.username }).commit();
    }
    return existing as { _id: string };
  }
  const created = await sanityClient.create({
    _type: "author",
    name: author.username,
    slug: { _type: "slug", current: slugify(author.username) },
    email: author.email,
    auth0Id: author.auth0Id,
  });
  return created as { _id: string };
}

function genKey(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function resolveCategoryRefs(slugs: string[]): Promise<{ _type: "reference"; _ref: string; _key: string }[]> {
  if (!slugs.length) return [];
  const cats: { _id: string; slug: string }[] = await sanityClient.fetch(
    `*[_type=="category" && slug.current in $slugs]{ _id, "slug": slug.current }`,
    { slugs }
  );
  const bySlug = new Map(cats.map((c) => [c.slug, c._id]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) throw new Error(`Categories not found in Sanity: ${missing.join(", ")}`);
  return slugs.map((s) => ({ _key: genKey(), _type: "reference", _ref: bySlug.get(s)! }));
}

export async function uploadSanityImage(base64: string, filename: string): Promise<{ assetId: string; url: string }> {
  if (!base64?.startsWith("data:")) throw new Error("Invalid base64 image data");
  const base64Data = base64.split(";base64,").pop();
  if (!base64Data) throw new Error("Invalid base64 image");
  const buffer = Buffer.from(base64Data, "base64");
  const asset = await sanityClient.assets.upload("image", buffer, { filename });
  return { assetId: asset._id, url: asset.url };
}
