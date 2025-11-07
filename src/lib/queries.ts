import { gql } from "@apollo/client";

// ALL BLOG POSTS
export const GET_ALL_POSTS = gql`
  query GetAllPosts {
    blogs {
      title
      documentId
      slug
      description
      content
      category {
        documentId
        name
        slug
        description
      }
      cover {
        url
      }
      author {
        name
        email
      }
      createdAt
      updatedAt
    }
  }
`;

// SINGLE BLOG POST BY DOCUMENT ID
export const GET_POST_BY_DOCUMENT_ID = gql`
  query GetPostByDocumentId($documentId: ID!) {
    blog(documentId: $documentId) {
      title
      slug
      description
      content
      category {
        documentId
        name
        slug
        description
      }
      cover {
        url
      }
      author {
        name
        email
      }
      createdAt
      updatedAt
    }
  }
`;

// SINGLE CATEGORY BY DOCUMENT ID WITH BLOGS 
export const GET_CATEGORY_BY_DOCUMENT_ID = gql`
  query GetCategoryByDocumentId($documentId: ID!) {
    category(documentId: $documentId) {
      documentId
      name
      slug
      description
      blogs_connection {
        nodes {
          title
          documentId
          slug
          description
          content
          createdAt
          updatedAt
          cover { url }
          author { name email }
          # If you need categories on each blog card, add:
          # category { documentId name slug description }
        }
      }
    }
  }
`;


// ALL CATEGORIES (flat)
export const GET_ALL_CATEGORIES = gql`
  query GetAllCategories {
    categories {
      documentId
      name
      slug
      description
      createdAt
      updatedAt
      publishedAt
    }
  }
`;


// TypeScript types for data
export type ImageData = {
  url: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, { url: string; width: number; height: number }>;
};

export type Author = {
  name: string;
  // Optional email field
  email?: string | null;
};

export type Category = {
  documentId: string;
  name: string;
  slug?: string;
  description?: string | null;
};

// Blog Post type
export type BlogPost = {
  documentId: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  cover?: ImageData;
  author?: Author;
  category?: Category[];
};

// GET_ALL_POSTS
export type GetAllPostsResult = {
  blogs: Array<{
    title: string;
    documentId: string;
    slug?: string | null;
    description?: string | null;
    content?: string | null;
    category?: Category[]; // returned as array in your schema
    cover?: { url?: string | null } | null;
    author?: { name: string; email?: string | null } | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
};

// GET_POST_BY_DOCUMENT_ID
export type GetPostByDocumentIdResult = {
  blog?: {
    title: string;
    slug?: string | null;
    description?: string | null;
    content?: string | null;
    category?: Category[];
    cover?: { url?: string | null } | null;
    author?: { name: string; email?: string | null } | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
};

// GET_CATEGORY_BY_DOCUMENT_ID
export type GetCategoryByDocumentIdResult = {
  category?: {
    documentId: string;
    name: string;
    slug: string;
    description?: string | null;
    blogs_connection?: {
      nodes: Array<{
        documentId: string;
        title: string;
        slug?: string | null;
        description?: string | null;
        content?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
        cover?: { url?: string | null } | null;
        author?: { name: string; email?: string | null } | null;
      }>;
    } | null;
  };
};


// GET_ALL_CATEGORIES (flat)
export type GetAllCategoriesResult = {
  categories: Array<{
    documentId: string;
    name: string;
    slug: string;
    description?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    publishedAt?: string | null;
  }>;
};
