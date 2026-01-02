import { client } from "@/lib/apolloClient";
import { GET_POST_BY_DOCUMENT_ID } from "@/lib/queries";
import type { BlogPost } from "@/lib/types";
import BlogPostClient from "./BlogPostClient";

/**
 * Server component: fetches blog post data
 */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ✅ unwrap new Next.js param Promise

  try {
    const { data } = await client.query<{ blog: BlogPost }>({
      query: GET_POST_BY_DOCUMENT_ID,
      variables: { documentId: id },
      fetchPolicy: "no-cache",
    });

    const post = data?.blog;

    if (!post) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center bg-slate-950 text-gray-300">
          No post found.
        </div>
      );
    }

    return <BlogPostClient post={post} />;
  } catch (error) {
    console.error("Error fetching blog:", error);
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-950 text-red-500">
        Failed to load blog. Please try again later.
      </div>
    );
  }
}
