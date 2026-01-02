import EditBlogClient from "./EditBlogClient";

const STRAPI_BASE =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

async function fetchBlog(documentId: string) {
  const res = await fetch(`${STRAPI_BASE}/api/blogs/${documentId}?populate=*`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = await res.json();

  const d = json.data;
  if (!d) return null;

  return {
    documentId: d.documentId,
    title: d.title,
    description: d.description,
    content: d.content,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    cover: d.cover ? { url: d.cover.url } : null,
    category: d.category || [],
    author: d.author || null,
    writer: d.writer || null,
  };
}

export default async function EditBlogPage({
  params,
}: {
  params: { id: string };
}) {
  const blog = await fetchBlog(params.id);

  if (!blog) {
    return (
      <div className="min-h-screen bg-slate-950 text-gray-300 flex items-center justify-center">
        Blog not found.
      </div>
    );
  }

  return <EditBlogClient blog={blog} />;
}
