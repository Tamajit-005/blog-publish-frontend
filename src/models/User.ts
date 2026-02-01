import mongoose, { Document, Model } from "mongoose";

export interface IUser extends Document {
  auth0Id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "superadmin";

  lastLoginAt?: Date;
  lastLoginIp?: string;

  lastLogoutAt?: Date;
  lastLogoutIp?: string;

  // 🔗 Strapi linkage (SERVER ONLY)
  strapi?: {
    userId?: number;
    password?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },

    // 🔗 Strapi linkage (SERVER ONLY)
    strapi: {
      userId: {
        type: Number,
      },
      password: {
        type: String,
        select: false,
      },
    },

    lastLoginAt: Date,
    lastLoginIp: String,

    lastLogoutAt: Date,
    lastLogoutIp: String,
  },
  { timestamps: true }
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
