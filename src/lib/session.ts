import { SessionOptions } from "iron-session";

export interface SessionData {
  user?: {
    sub: string;
    email: string;
    name?: string;
    nickname?: string;
    picture?: string;
    username: string;
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
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  },
};
