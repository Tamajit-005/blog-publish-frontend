import { SessionOptions } from "iron-session";

export interface SessionData {
  user?: {
    sub: string;
    email: string;
    username: string;

    // Optional fields from the OIDC provider
    role?: "user" | "admin" | "superadmin";

    name?: string;
    nickname?: string;
    picture?: string;
  };

  accessToken?: string;
  idToken?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string, // Must be at least 32 characters
  cookieName: "palette_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 10, // 10 days
    path: "/",
  },
};
