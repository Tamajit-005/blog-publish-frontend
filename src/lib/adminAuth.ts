import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function checkAdminAuth(requireSuperadmin = false) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session?.user?.sub || !session.isLoggedIn) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  await dbConnect();

  const user = await User.findOne({ auth0Id: session.user.sub });

  if (!user) {
    return { authorized: false, error: "User not found", status: 404 };
  }

  if (requireSuperadmin && user.role !== "superadmin") {
    return {
      authorized: false,
      error: "Superadmin access required",
      status: 403,
    };
  }

  if (!requireSuperadmin && user.role !== "admin" && user.role !== "superadmin") {
    return {
      authorized: false,
      error: "Admin access required",
      status: 403,
    };
  }

  return {
    authorized: true,
    user: {
      id: user._id,
      auth0Id: user.auth0Id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}

export async function checkUserAuth() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session?.user?.sub || !session.isLoggedIn) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  await dbConnect();

  const user = await User.findOne({ auth0Id: session.user.sub });

  if (!user) {
    return { authorized: false, error: "User not found", status: 404 };
  }

  return {
    authorized: true,
    user: {
      id: user._id,
      auth0Id: user.auth0Id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}
