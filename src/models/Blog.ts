import mongoose, { Document, Model } from "mongoose";

type InlineImage = {
  id: string;
  placeholder: string;
  r2Key?: string;
  r2Url?: string;
  strapiUrl?: string;
  strapiId?: number;
};

type PendingEdit = {
  title: string;
  slug: string;
  content: string;
  description: string;
  r2CoverKey?: string | null;
  r2CoverUrl?: string | null;
  coverImageName?: string;
  strapiCoverUrl?: string | null;
  strapiCoverId?: number;
  inlineImages?: InlineImage[];
  categories: string[];
};

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  description: string;
  r2CoverKey?: string;
  r2CoverUrl?: string;
  coverImageName?: string;
  strapiCoverUrl?: string;
  strapiCoverId?: number;
  inlineImages?: InlineImage[];
  categories: string[];
  author: { auth0Id: string; username: string; email: string };
  status: "draft" | "pending" | "approved" | "rejected" | "published";
  deletionRequested?: boolean;
  deletionRequestedAt?: Date;
  isDeletionRejected?: boolean;
  isEditPending?: boolean;
  isEditRejected?: boolean;
  pendingEdit?: PendingEdit;
  adminNotes?: string;
  deletionRejectedNotes?: string;
  strapiId?: string;
  strapiWriterId?: number;
  publishedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InlineImageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    placeholder: { type: String, required: true },
    r2Key: { type: String },
    r2Url: { type: String },
    strapiUrl: { type: String },
    strapiId: { type: Number },
  },
  { _id: false }
);

const PendingEditSchema = new mongoose.Schema(
  {
    title: String,
    slug: String,
    content: String,
    description: String,
    r2CoverKey: { type: String, default: null },
    r2CoverUrl: { type: String, default: null },
    coverImageName: String,
    strapiCoverUrl: { type: String, default: null },
    strapiCoverId: Number,
    inlineImages: [InlineImageSchema],
    categories: [String],
  },
  { _id: false }
);

const BlogSchema = new mongoose.Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true, minlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },

    r2CoverKey: String,
    r2CoverUrl: String,
    coverImageName: String,

    strapiCoverUrl: String,
    strapiCoverId: Number,

    inlineImages: [InlineImageSchema],

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
      type: PendingEditSchema,
      default: undefined,
    },

    adminNotes: String,
    deletionRejectedNotes: String,
    strapiId: String,
    strapiWriterId: Number,
    publishedAt: Date,
    rejectedAt: Date,
  },
  { timestamps: true, strict: true }
);

BlogSchema.index({ "author.auth0Id": 1, status: 1 });
BlogSchema.index({ status: 1, createdAt: -1 });
BlogSchema.index({ categories: 1 });
BlogSchema.index({ deletionRequested: 1 });
BlogSchema.index({ isEditPending: 1 });

const Blog: Model<IBlog> =
  (mongoose.models.Blog as Model<IBlog>) ||
  mongoose.model<IBlog>("Blog", BlogSchema);

export default Blog;