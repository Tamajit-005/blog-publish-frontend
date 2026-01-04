import mongoose, { Document, Model } from "mongoose";

export interface IUser extends Document {
  auth0Id: string; // Auth0 user ID (sub)
  username: string;
  email: string;
  role: "user" | "admin" | "superadmin";

  // 🔐 Login tracking
  lastLoginAt?: Date;
  lastLoginIp?: string;

  // 🚪 Logout tracking
  lastLogoutAt?: Date;
  lastLogoutIp?: string;

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

    // 🔐 Login tracking
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },

    // 🚪 Logout tracking
    lastLogoutAt: {
      type: Date,
    },
    lastLogoutIp: {
      type: String,
    },
  },
  { timestamps: true }
);

// Avoid model overwrite issues in dev/HMR
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
