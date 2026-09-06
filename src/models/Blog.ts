import mongoose, { Document, Model } from "mongoose";

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  description: string;
  coverImage?: string;
  coverImageName?: string;
  sanityCoverAssetId?: string;
  inlineImages?: { id: string; placeholder: string; base64: string; sanityAssetId?: string; sanityUrl?: string }[];
  categories: string[];
  author: { auth0Id: string; username: string; email: string };
  status: "draft" | "pending" | "approved" | "rejected" | "published";
  deletionRequested?: boolean;
  deletionRequestedAt?: Date;
  isDeletionRejected?: boolean;
  isEditPending?: boolean;
  isEditRejected?: boolean;
  pendingEdit?: {
    title: string;
    slug: string;
    content: string;
    description: string;
    coverImage?: string;
    coverImageName?: string;
    sanityCoverAssetId?: string;
    inlineImages?: { id: string; placeholder: string; base64: string; sanityAssetId?: string; sanityUrl?: string }[];
    categories: string[];
  };
  adminNotes?: string;
  deletionRejectedNotes?: string;
  sanityId?: string;
  cardColor?: string;
  publishedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new mongoose.Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true, minlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    coverImage: String,
    coverImageName: String,
    sanityCoverAssetId: String,
    inlineImages: [
      {
        id: { type: String, required: true },
        placeholder: { type: String, required: true },
        base64: { type: String, required: true },
        sanityAssetId: { type: String },
        sanityUrl: { type: String },
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
    deletionRequestedAt: { type: Date, default: null },
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
      sanityCoverAssetId: String,
      inlineImages: [
        {
          id: { type: String, required: true },
          placeholder: { type: String, required: true },
          base64: { type: String, required: true },
          sanityAssetId: { type: String },
          sanityUrl: { type: String },
        },
      ],
      categories: [String],
    },
    adminNotes: String,
    deletionRejectedNotes: String,
    sanityId: String,
    cardColor: { type: String, default: null },
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
BlogSchema.index({ sanityId: 1 });

if (mongoose.models.Blog) delete mongoose.models.Blog;
const Blog: Model<IBlog> = mongoose.model<IBlog>("Blog", BlogSchema);
export default Blog;
