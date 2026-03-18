import mongoose, { Document, Model } from "mongoose";

export interface IBlog extends Document {
  title: string; // Title of the blog post
  slug: string; // URL-friendly unique identifier generated from the title
  content: string; // Main content of the blog post, stored as HTML
  description: string; // Short summary of the blog post, used for previews and SEO
  coverImage?: string; // URL of cover image
  coverImageName?: string; // Original filename of the cover image
  inlineImages?: { id: string; placeholder: string; base64: string }[]; // Array of inline images with unique ID, placeholder text in content, and base64 data for upload
  categories: string[]; // Array of categories/tags associated with the blog post
  author: { auth0Id: string; username: string; email: string }; // Author information including Auth0 ID, username, and email
  status: "draft" | "pending" | "approved" | "rejected" | "published";
  deletionRequested?: boolean; // Flag to indicate if the author has requested deletion of the blog post
  deletionRequestedAt?: Date; // Timestamp of when the deletion request was made, used to enforce the 10-minute cancellation window
  isDeletionRejected?: boolean; // Flag to indicate if the deletion request has been rejected by admin
  isEditPending?: boolean; // Flag to indicate if there is a pending edit awaiting admin approval
  isEditRejected?: boolean; // Flag to indicate if the pending edit has been rejected by admin

  // If isEditPending is true, this field holds the proposed changes to the blog post that are awaiting admin approval. It has the same structure as the main blog fields, but all are optional since an edit might only change a subset of fields.
  pendingEdit?: {
    title: string;
    slug: string;
    content: string;
    description: string;
    coverImage?: string;
    coverImageName?: string;
    inlineImages?: { id: string; placeholder: string; base64: string }[];
    categories: string[];
  };
  adminNotes?: string; // Admin notes for the blog post, used to communicate reasons for rejection or other feedback to the author
  deletionRejectedNotes?: string; // Admin notes specifically for rejected deletion requests, used to communicate reasons for rejection to the author
  strapiId?: number; // Optional field to store the corresponding Strapi ID if the blog is published to Strapi
  strapiWriterId?: number; // Optional field to store the corresponding Strapi Writer ID if the blog is published to Strapi
  publishedAt?: Date; // Date when the blog post was published
  rejectedAt?: Date; // Date when the blog post was rejected
  createdAt: Date; // Date when the blog post was created
  updatedAt: Date; // Date when the blog post was last updated
}

const BlogSchema = new mongoose.Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true, minlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    coverImage: String,
    coverImageName: String,
    inlineImages: [
      {
        id: { type: String, required: true },
        placeholder: { type: String, required: true },
        base64: { type: String, required: true },
      },
    ],
    categories: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0 && v.length <= 3,
        message: "Please select 1-3 categories",
      },
    },
    author: {
      auth0Id: { type: String, required: true },
      username: { type: String, required: true },
      email: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "published"],
      default: "pending",
    },
    deletionRequested: { type: Boolean, default: false },
    deletionRequestedAt: { type: Date, default: null }, // Timestamp of when the deletion request was made
    isDeletionRejected: { type: Boolean, default: false },
    isEditPending: { type: Boolean, default: false },
    isEditRejected: { type: Boolean, default: false },
    pendingEdit: {
      title: String,
      slug: String,
      content: String,
      description: String,
      coverImage: String,
      coverImageName: String,
      inlineImages: Array,
      categories: [String],
    },
    adminNotes: String,
    deletionRejectedNotes: String,
    strapiId: Number,
    strapiWriterId: Number,
    publishedAt: Date,
    rejectedAt: Date,
  },
  { timestamps: true, strict: true },
);

BlogSchema.index({ "author.auth0Id": 1, status: 1 });
BlogSchema.index({ status: 1, createdAt: -1 });
BlogSchema.index({ categories: 1 });
BlogSchema.index({ deletionRequested: 1 });
BlogSchema.index({ isEditPending: 1 });

if (mongoose.models.Blog) delete mongoose.models.Blog;
const Blog: Model<IBlog> = mongoose.model<IBlog>("Blog", BlogSchema);
export default Blog;
