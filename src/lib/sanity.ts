import { createClient } from "@sanity/client";

if (!process.env.SANITY_API_TOKEN) {
  console.warn("⚠️ SANITY_API_TOKEN not set — Sanity writes will fail");
}

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "xxv30rrb",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-05-15",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
