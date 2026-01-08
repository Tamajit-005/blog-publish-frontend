import mongoose, { Document, Model } from "mongoose";

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  description: string;
  coverImage?: string;
  categories: string[];
  author: {
    auth0Id: string;
    username: string;
    email: string;
  };
  status: "draft" | "pending" | "approved" | "rejected" | "published";
  adminNotes?: string;
  strapiId?: number;
  strapiWriterId?: number;
  publishedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new mongoose.Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 300,
    },
    coverImage: {
      type: String,
    },
    categories: {  
      type: [String],
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0 && v.length <= 3;
        },
        message: 'Please select 1-3 categories'
      }
    },
    author: {
      auth0Id: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "published"],
      default: "pending",
    },
    adminNotes: {
      type: String,
    },
    strapiId: {
      type: Number,
    },
    strapiWriterId: {
      type: Number,
    },
    publishedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  { 
    timestamps: true,
    strict: true
  }
);

// Indexes for better query performance
BlogSchema.index({ "author.auth0Id": 1, status: 1 });
BlogSchema.index({ status: 1, createdAt: -1 });
BlogSchema.index({ categories: 1 });

// Force delete cached model to prevent schema conflicts
if (mongoose.models.Blog) {
  delete mongoose.models.Blog;
}

const Blog: Model<IBlog> = mongoose.model<IBlog>("Blog", BlogSchema);

export default Blog;
