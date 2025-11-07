// Image interface 
export interface ImageData {
  url: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  formats?: Record<string, { url: string; width: number; height: number }>;
}

// Author interface 
export interface Author {
  name: string;
  email?: string;
}

// Category interface
export interface Category {
  documentId: string; 
  name: string;
  slug?: string;
  description?: string | null;
}

// Blog post interface 
export interface BlogPost {
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
}

// For creating a post (client-side)
export interface UserBlogPostData {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
}

// Pagination (if added later to GraphQL)
export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

// Generic API response types (for consistency)
export interface BlogPostResponse {
  data: BlogPost[];
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface SingleBlogPostResponse {
  data: BlogPost;
}

export interface CategoryResponse {
  data: Category[];
  meta?: {
    pagination?: PaginationMeta;
  };
}
