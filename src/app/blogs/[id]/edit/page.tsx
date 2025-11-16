import EditBlogClient from "./EditBlogClient";

const STRAPI_BASE =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

/* -------------------------------------------------------
   Fetch single blog (REST)
------------------------------------------------------- */
async function fetchBlog(documentId: string) {
  const res = await fetch(`${STRAPI_BASE}/api/blogs/${documentId}?populate=*`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = await res.json();
  const data = json?.data;

  if (!data) return null;

  return {
    documentId: data.documentId,
    title: data.title,
    description: data.description,
    content: data.content,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,

    // FIXED → REST uses categories (plural)
    categories: data.categories || [],

    cover: data.cover
      ? {
          url: data.cover.url,
        }
      : null,

    author: data.author || null,
    writer: data.writer || null,
  };
}

/* -------------------------------------------------------
   PAGE
------------------------------------------------------- */
export default async function EditBlogPage({
  params,
}: {
  params: { id: string };
}) {
  const blog = await fetchBlog(params.id);

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
        Blog not found.
      </div>
    );
  }

  return <EditBlogClient blog={blog} />;
}
