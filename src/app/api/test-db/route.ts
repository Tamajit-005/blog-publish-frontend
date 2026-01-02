import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function GET() {
  try {
    console.log("Attempting MongoDB connection...");
    
    await connectToDatabase();
    console.log("MongoDB connected");

    // Count existing users
    const count = await User.countDocuments();
    console.log(`Total users in database: ${count}`);

    // Get all users
    const users = await User.find().select("-__v").limit(10);

    return NextResponse.json({
      status: "MongoDB Connected",
      database: process.env.MONGODB_URI?.split("@")[1]?.split("?")[0] || "unknown",
      totalUsers: count,
      users: users.map(u => ({
        id: u._id,
        auth0Id: u.auth0Id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("MongoDB Error:", error);
    return NextResponse.json(
      {
        status: "Error",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { auth0Id, username, email, role } = await req.json();

    console.log("Creating test user:", { auth0Id, username, email });

    await connectToDatabase();

    const user = await User.create({
      auth0Id: auth0Id || `auth0|test_${Date.now()}`,
      username: username || `user_${Date.now()}`,
      email: email || `test_${Date.now()}@example.com`,
      role: role || "user",
    });

    console.log("User created:", user._id);

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        id: user._id,
        auth0Id: user.auth0Id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
