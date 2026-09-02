// Categories — mirrors Sanity category slugs (production dataset: xxv30rrb)
export const SANITY_CATEGORIES = [
  { name: "Lifestyle",    slug: "lifestyle" },
  { name: "Tech",         slug: "tech" },
  { name: "Food",         slug: "food" },
  { name: "Nature",       slug: "nature" },
  { name: "Culture",      slug: "culture" },
  { name: "Entertainment", slug: "entertainment" },
];

export const FIXED_CATEGORIES = [...SANITY_CATEGORIES];
export type CategorySlug = typeof SANITY_CATEGORIES[number]["slug"];
