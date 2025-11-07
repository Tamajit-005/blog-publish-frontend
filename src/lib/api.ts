import { client } from "@/lib/apolloClient";
import { gql } from "@apollo/client";
import type { BlogPost, Category, UserBlogPostData } from "@/lib/types";

/* ---------------------------------
   🔍 READ OPERATIONS (Public)
----------------------------------*/

// Fetch all published blogs
export async function getAllPosts(): Promise<BlogPost[]> {
  const GET_ALL_POSTS = gql`
    query GetAllPosts {
      blogs {
        documentId
        title
        description
        content
        createdAt
        updatedAt
        cover {
          url
        }
        category {
          documentId
          name
        }
        author {
          name
          email
        }
      }
    }
  `;

  const { data } = await client.query<{ blogs: BlogPost[] }>({
    query: GET_ALL_POSTS,
    fetchPolicy: "no-cache",
  });

  if (!data?.blogs) throw new Error("No blogs found.");
  return data.blogs;
}

// Fetch single blog by ID
export async function getPostByDocumentId(documentId: string): Promise<BlogPost> {
  const GET_POST_BY_DOCUMENT_ID = gql`
    query GetPostByDocumentId($documentId: ID!) {
      blog(documentId: $documentId) {
        documentId
        title
        slug
        description
        content
        createdAt
        updatedAt
        cover {
          url
        }
        category {
          documentId
          name
        }
        author {
          name
          email
        }
      }
    }
  `;

  const { data } = await client.query<{ blog: BlogPost | null }>({
    query: GET_POST_BY_DOCUMENT_ID,
    variables: { documentId },
    fetchPolicy: "no-cache",
  });

  if (!data?.blog) throw new Error("Blog not found.");
  return data.blog;
}

/* ---------------------------------
   🧠 CATEGORY QUERIES
----------------------------------*/

export async function getAllCategories(): Promise<Category[]> {
  const GET_ALL_CATEGORIES = gql`
    query GetAllCategories {
      categories {
        documentId
        name
        slug
        description
      }
    }
  `;

  const { data } = await client.query<{ categories: Category[] }>({
    query: GET_ALL_CATEGORIES,
    fetchPolicy: "no-cache",
  });

  if (!data?.categories) throw new Error("No categories found.");
  return data.categories;
}

/* ---------------------------------
   ✍️ MUTATIONS (Authorized Users)
----------------------------------*/

// Create new blog (requires Auth header)
export async function createBlog(postData: UserBlogPostData, token: string) {
  const CREATE_BLOG = gql`
    mutation CreateBlog($data: BlogInput!) {
      createBlog(data: $data) {
        documentId
        title
        description
        content
        createdAt
      }
    }
  `;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_GRAPHQL_URL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: CREATE_BLOG.loc?.source.body,
        variables: { data: postData },
      }),
    }
  );

  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data.createBlog;
}

// Update existing blog (requires Auth header)
export async function updateBlog(documentId: string, postData: UserBlogPostData, token: string) {
  const UPDATE_BLOG = gql`
    mutation UpdateBlog($documentId: ID!, $data: BlogInput!) {
      updateBlog(documentId: $documentId, data: $data) {
        documentId
        title
        updatedAt
      }
    }
  `;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_GRAPHQL_URL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: UPDATE_BLOG.loc?.source.body,
        variables: { documentId, data: postData },
      }),
    }
  );

  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data.updateBlog;
}

// Delete blog (requires Auth header)
export async function deleteBlog(documentId: string, token: string) {
  const DELETE_BLOG = gql`
    mutation DeleteBlog($documentId: ID!) {
      deleteBlog(documentId: $documentId) {
        documentId
        title
      }
    }
  `;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_GRAPHQL_URL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: DELETE_BLOG.loc?.source.body,
        variables: { documentId },
      }),
    }
  );

  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data.deleteBlog;
}
